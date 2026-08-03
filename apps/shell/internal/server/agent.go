package server

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/neoworks/neoshell/internal/nib"
)

// The agent bridge. One nib session drives every surface, and this file is the
// only place that knows nib's event vocabulary — everything downstream sees
// "agent:*" topics.
//
// State topics (agent:state, agent:tools) are cached so a surface that connects
// mid-turn hydrates correctly. Increments (deltas, tool phases) are ephemeral:
// replaying one stale token to a late subscriber is worse than silence.

// toolLabelRefresh bounds how long the shell waits for nib's tool list.
const toolLabelRefresh = 10 * time.Second

// agentBridge holds the live session and the tool metadata used to render it.
type agentBridge struct {
	mu      sync.RWMutex
	client  *nib.Client
	session *nib.Session
	// gate is a separate, tool-free session used only by the voice
	// addressivity classifier, so that machinery stays out of the user's
	// conversation. Opened lazily; see voice.go.
	gate    *nib.Session
	labels  map[string]string
	restart func()
}

// OnAgentRestart registers what `neoshell emit agent:restart` should do. The
// server does not own the backend process, so restarting is delegated back to
// whoever spawned it.
func (s *Server) OnAgentRestart(fn func()) {
	s.agent.mu.Lock()
	s.agent.restart = fn
	s.agent.mu.Unlock()
}

// AttachAgent binds a live nib session to the server. Called once the backend
// reports healthy, and again after a restart, so the routes below always act on
// the current session rather than a dead one.
func (s *Server) AttachAgent(client *nib.Client, session *nib.Session) {
	s.agent.mu.Lock()
	s.agent.client = client
	s.agent.session = session
	// The gate belonged to the previous backend process; it is gone with it.
	s.agent.gate = nil
	s.agent.mu.Unlock()

	session.Subscribe(s.onAgentEvent)
	s.broadcastAgentState()
}

// DetachAgent clears the session when the backend goes away, so a surface sees
// "down" rather than a hang.
func (s *Server) DetachAgent(reason string) {
	s.agent.mu.Lock()
	s.agent.session = nil
	s.agent.gate = nil
	s.agent.mu.Unlock()
	s.hub.Broadcast("agent:state", map[string]any{
		"status": nib.StatusDown,
		"error":  reason,
	})
}

func (s *Server) agentSession() *nib.Session {
	s.agent.mu.RLock()
	defer s.agent.mu.RUnlock()
	return s.agent.session
}

// SetAgentTools caches nib's tool list so tool calls render with a human label
// instead of a bare identifier. Extensions register tools the shell has never
// heard of, so the label has to come from nib rather than a table in here.
func (s *Server) SetAgentTools(tools []nib.ToolInfo) {
	labels := make(map[string]string, len(tools))
	summary := make([]map[string]string, 0, len(tools))
	for _, tool := range tools {
		label := tool.Display.Label
		if label == "" {
			label = humanizeTool(tool.Name)
		}
		labels[tool.Name] = label
		summary = append(summary, map[string]string{
			"name":        tool.Name,
			"label":       label,
			"policy":      tool.Policy,
			"description": tool.Description,
		})
	}
	s.agent.mu.Lock()
	s.agent.labels = labels
	s.agent.mu.Unlock()
	s.hub.Broadcast("agent:tools", map[string]any{"tools": summary})
}

func (s *Server) toolLabel(name string) string {
	s.agent.mu.RLock()
	label, ok := s.agent.labels[name]
	s.agent.mu.RUnlock()
	if ok {
		return label
	}
	return humanizeTool(name)
}

// humanizeTool turns a tool identifier into something readable when nib offers
// no display label: neoshell_windows_focus → "windows focus".
func humanizeTool(name string) string {
	name = strings.TrimPrefix(name, "neoshell_")
	return strings.ReplaceAll(name, "_", " ")
}

// onAgentEvent translates one nib event into shell topics.
func (s *Server) onAgentEvent(event nib.Event) {
	// A spoken turn needs the same stream under its own request id, so the
	// daemon can feed sentences to the speaker as they arrive.
	s.mirrorVoiceEvent(event)

	switch event.Type {
	case nib.EventStatusRunning, nib.EventStatusIdle, nib.EventStatusTerminated:
		s.broadcastAgentState()

	case nib.EventMessageStart:
		s.hub.BroadcastEphemeral("agent:message", map[string]any{"start": true})

	case nib.EventMessageDelta:
		s.hub.BroadcastEphemeral("agent:message", map[string]any{"delta": event.Text})

	case nib.EventMessageEnd:
		// The content blocks are authoritative — a surface that missed deltas
		// across a reconnect still ends up with the right text.
		s.hub.BroadcastEphemeral("agent:message", map[string]any{
			"done": true,
			"text": nib.TextContent(event.Content),
		})

	case nib.EventThinkingDelta:
		s.hub.BroadcastEphemeral("agent:thinking", map[string]any{"delta": event.Text})

	case nib.EventToolUse, nib.EventToolUseEdited:
		s.hub.BroadcastEphemeral("agent:tool", map[string]any{
			"toolUseId":  event.ToolUseID,
			"name":       event.Name,
			"label":      s.toolLabel(event.Name),
			"input":      rawOrNull(event.Input),
			"permission": event.Permission,
			"phase":      "start",
		})
		if event.Permission == "ask" {
			s.broadcastAgentState()
		}

	case nib.EventToolProgress:
		s.hub.BroadcastEphemeral("agent:tool", map[string]any{
			"toolUseId": event.ToolUseID,
			"phase":     "progress",
			"message":   event.Message,
		})

	case nib.EventToolResult:
		s.hub.BroadcastEphemeral("agent:tool", map[string]any{
			"toolUseId": event.ToolUseID,
			"name":      event.Name,
			"phase":     "result",
			"content":   nib.ResultText(event.Content),
			"isError":   event.IsError,
		})
		s.broadcastAgentState()

	case nib.EventError:
		s.hub.BroadcastEphemeral("agent:error", map[string]any{"message": event.Message})

	case nib.EventNotice:
		s.hub.BroadcastEphemeral("agent:notice", map[string]any{"message": event.Message})

	case nib.EventSurface:
		// An extension's own declarative UI. Passed through verbatim; the notch
		// decides what it can render and falls back on the rest.
		s.hub.Broadcast("agent:surface", map[string]any{
			"surfaceId": event.SurfaceID,
			"slot":      event.Slot,
			"view":      rawOrNull(event.View),
		})
	}
}

// broadcastAgentState publishes the session's status and pending approvals.
// Cached, so a surface that appears mid-turn knows what is waiting.
func (s *Server) broadcastAgentState() {
	session := s.agentSession()
	if session == nil {
		s.hub.Broadcast("agent:state", map[string]any{"status": nib.StatusDown})
		return
	}
	state := session.State()
	approvals := make([]map[string]any, 0, len(state.Approvals))
	for _, approval := range state.Approvals {
		approvals = append(approvals, map[string]any{
			"toolUseId": approval.ToolUseID,
			"name":      approval.Name,
			"label":     s.toolLabel(approval.Name),
		})
	}
	s.hub.Broadcast("agent:state", map[string]any{
		"status":    state.Status,
		"sessionId": state.SessionID,
		"approvals": approvals,
	})
}

// --- inbound routes ---

func (s *Server) handleAgentAsk(prompt string) {
	session := s.agentSession()
	if session == nil {
		s.hub.BroadcastEphemeral("agent:error", map[string]any{"message": "The agent backend is not running."})
		return
	}
	if strings.TrimSpace(prompt) == "" {
		return
	}
	if err := session.Ask(context.Background(), prompt, nib.DeliverSteer); err != nil {
		log.Printf("agent ask: %v", err)
		s.hub.BroadcastEphemeral("agent:error", map[string]any{"message": err.Error()})
	}
}

func (s *Server) handleAgentInterrupt() {
	session := s.agentSession()
	if session == nil {
		return
	}
	if err := session.Interrupt(context.Background()); err != nil {
		log.Printf("agent interrupt: %v", err)
	}
}

// handleAgentApprove answers a pending approval. An empty toolUseId answers the
// oldest one, which is what the keybinds send — a person pressing "yes" is
// answering the thing in front of them, not naming an id.
func (s *Server) handleAgentApprove(toolUseID, result, reason string) {
	session := s.agentSession()
	if session == nil {
		return
	}
	var err error
	if toolUseID == "" {
		err = session.ConfirmOldest(context.Background(), result)
	} else {
		err = session.Confirm(context.Background(), toolUseID, result, reason)
	}
	if err != nil {
		log.Printf("agent approve: %v", err)
		s.hub.BroadcastEphemeral("agent:notice", map[string]any{"message": err.Error()})
		return
	}
	s.broadcastAgentState()
}

func (s *Server) restartAgent() {
	s.agent.mu.RLock()
	restart := s.agent.restart
	s.agent.mu.RUnlock()
	if restart == nil {
		return
	}
	restart()
}

// rawOrNull keeps a raw JSON field as-is for re-encoding, substituting null
// when it is absent so the surface sees a field rather than a missing key.
func rawOrNull(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 {
		return json.RawMessage("null")
	}
	return raw
}
