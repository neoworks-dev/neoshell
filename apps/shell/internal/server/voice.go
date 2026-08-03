package server

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"sync"

	"github.com/neoworks/neoshell/internal/nib"
)

// The voice pipeline runs in a separate, opt-in process (neoshell-voice). It
// owns the microphone, the STT/TTS sidecars, and the turn state machine, but the
// answer comes from the shell's one agent session — so speaking to the assistant
// and typing at it are the same conversation, and a tool approved by voice is
// the same approval the notch is showing.
//
// These handlers are that bridge. A voice turn drives the shared session and
// mirrors its output back to the daemon under the daemon's own request id.

// forwardVoiceControl relays a keybind/WS voice control action to the voice
// daemon (if any) over the hub. The daemon subscribes to "voice:control".
func (s *Server) forwardVoiceControl(action string) {
	s.hub.Broadcast("voice:control", map[string]any{"action": action})
}

// OnVoiceToggle registers what flips voice mode. The server does not own the
// daemon process, so the work is delegated back to whoever spawned it; the
// callback returns the new state.
func (s *Server) OnVoiceToggle(fn func() bool) {
	s.agent.mu.Lock()
	s.voiceToggle = fn
	s.agent.mu.Unlock()
}

// toggleVoice flips voice mode and tells the surfaces about it.
func (s *Server) toggleVoice() {
	s.agent.mu.RLock()
	toggle := s.voiceToggle
	s.agent.mu.RUnlock()
	if toggle == nil {
		return
	}
	s.hub.Broadcast("voice:mode", map[string]any{"enabled": toggle()})
}

// voiceTurn is the in-flight spoken turn, if any. There is at most one: the
// session runs a single turn at a time, so a second request would only be
// waiting on the first anyway.
type voiceTurn struct {
	mu     sync.Mutex
	id     string
	client *Client
	reply  strings.Builder
}

// begin claims the turn. It replaces any previous one, which can only be a turn
// the daemon has already abandoned.
func (v *voiceTurn) begin(id string, c *Client) {
	v.mu.Lock()
	defer v.mu.Unlock()
	v.id, v.client, v.reply = id, c, strings.Builder{}
}

func (v *voiceTurn) end(id string) {
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.id == id {
		v.id, v.client = "", nil
	}
}

// current returns the live turn's id and client, or "" when none is running.
func (v *voiceTurn) current() (string, *Client) {
	v.mu.Lock()
	defer v.mu.Unlock()
	return v.id, v.client
}

func (v *voiceTurn) appendReply(text string) {
	v.mu.Lock()
	defer v.mu.Unlock()
	v.reply.WriteString(text)
}

func (v *voiceTurn) setReply(text string) {
	v.mu.Lock()
	defer v.mu.Unlock()
	v.reply.Reset()
	v.reply.WriteString(text)
}

func (v *voiceTurn) text() string {
	v.mu.Lock()
	defer v.mu.Unlock()
	return v.reply.String()
}

// handleVoiceAsk starts a spoken turn on the shared agent session.
func (s *Server) handleVoiceAsk(c *Client, msg InMessage) {
	session := s.agentSession()
	if session == nil {
		s.sendVoiceDone(c, map[string]any{"id": msg.ID, "error": "the assistant backend is not running"})
		return
	}
	s.voice.begin(msg.ID, c)
	// The panel opens so a spoken turn is visible — and so an approval it runs
	// into is answerable without guessing what was asked.
	s.broadcastAgentPanel(false, false)
	if err := session.Ask(context.Background(), msg.Prompt, nib.DeliverSteer); err != nil {
		s.voice.end(msg.ID)
		s.sendVoiceDone(c, map[string]any{"id": msg.ID, "error": err.Error()})
	}
}

// handleVoiceCancel is barge-in: the user started talking over the reply, so the
// turn is aborted rather than left running against a speaker gone quiet.
func (s *Server) handleVoiceCancel(msg InMessage) {
	s.voice.end(msg.ID)
	session := s.agentSession()
	if session == nil {
		return
	}
	if err := session.Interrupt(context.Background()); err != nil {
		log.Printf("voice: interrupt: %v", err)
	}
}

// mirrorVoiceEvent forwards one agent event to the voice daemon, if a spoken
// turn is running. Called from the agent event handler.
func (s *Server) mirrorVoiceEvent(event nib.Event) {
	id, client := s.voice.current()
	if id == "" || client == nil {
		return
	}

	switch event.Type {
	case nib.EventMessageStart:
		s.voice.setReply("")

	case nib.EventMessageDelta:
		s.voice.appendReply(event.Text)
		s.sendVoiceToken(client, id, event.Text)

	case nib.EventMessageEnd:
		// The final content is authoritative; the deltas were only for latency.
		if text := nib.TextContent(event.Content); text != "" {
			s.voice.setReply(text)
		}

	case nib.EventToolUse:
		s.sendVoiceStatus(client, id, "Running "+s.toolLabel(event.Name)+"…")

	case nib.EventStatusIdle:
		if event.StopReason == nib.IdleRequiresAction {
			// The turn is parked on a human. Say so rather than going quiet;
			// the notch carries the actual question and its buttons.
			s.sendVoiceStatus(client, id, "Waiting for your approval.")
			return
		}
		s.voice.end(id)
		s.sendVoiceDone(client, map[string]any{"id": id, "text": s.voice.text()})

	case nib.EventError:
		s.voice.end(id)
		s.sendVoiceDone(client, map[string]any{"id": id, "error": event.Message})
	}
}

// handleVoiceAddressed answers the addressivity gate used by "always" mode.
//
// It runs on a session of its own, with no tools, so classifying background
// speech never appears in the user's conversation and can never call anything.
// It fails open: a gate that cannot be reached must not make the shell deaf.
func (s *Server) handleVoiceAddressed(c *Client, msg InMessage) {
	gate := s.voiceGate(context.Background())
	if gate == nil {
		s.sendVoiceDone(c, map[string]any{"id": msg.ID, "addressed": true})
		return
	}
	answer, err := gate.AskOnce(context.Background(), msg.Prompt)
	if err != nil {
		log.Printf("voice gate: %v", err)
		s.sendVoiceDone(c, map[string]any{"id": msg.ID, "addressed": true})
		return
	}
	addressed := strings.HasPrefix(strings.ToLower(strings.TrimSpace(answer)), "yes")
	s.sendVoiceDone(c, map[string]any{"id": msg.ID, "addressed": addressed})
}

const gatePrompt = "You are the gate for a voice assistant. Every message you receive is something " +
	"the microphone picked up. Decide whether it was addressed TO the assistant — a request, " +
	"question, or command meant for it — or was just speech in the room. Answer with one word: yes or no."

// voiceGate lazily opens the classifier session. Returns nil when the backend
// is unavailable, which the caller treats as "assume addressed".
func (s *Server) voiceGate(ctx context.Context) *nib.Session {
	s.agent.mu.RLock()
	existing, client := s.agent.gate, s.agent.client
	s.agent.mu.RUnlock()
	if existing != nil {
		return existing
	}
	if client == nil {
		return nil
	}

	gate, err := nib.Open(ctx, client, nib.CreateSessionRequest{
		Title:              "neoshell voice gate",
		AppendSystemPrompt: gatePrompt,
		// No tools at all: this session only ever answers yes or no.
		ActiveTools: []string{},
	}, "")
	if err != nil {
		log.Printf("voice gate: %v", err)
		return nil
	}
	go gate.Run(ctx)

	s.agent.mu.Lock()
	defer s.agent.mu.Unlock()
	if s.agent.gate != nil {
		return s.agent.gate // lost a race; keep the winner
	}
	s.agent.gate = gate
	return gate
}

func (s *Server) sendVoiceToken(c *Client, id, token string) {
	data, _ := json.Marshal(OutMessage{Type: "agent:voice:token", Data: map[string]any{"id": id, "token": token}})
	c.Send(data)
}

func (s *Server) sendVoiceStatus(c *Client, id, status string) {
	data, _ := json.Marshal(OutMessage{Type: "agent:voice:status", Data: map[string]any{"id": id, "status": status}})
	c.Send(data)
}

func (s *Server) sendVoiceDone(c *Client, payload map[string]any) {
	data, _ := json.Marshal(OutMessage{Type: "agent:voice:done", Data: payload})
	c.Send(data)
}
