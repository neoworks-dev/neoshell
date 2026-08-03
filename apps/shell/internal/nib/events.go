package nib

import "encoding/json"

// The wire vocabulary. Client events are what the shell submits; Event is every
// frame the session stream produces. nib's server events are a flat union, so
// one struct with optional fields decodes all of them without a two-pass parse.

// ClientEvent is one entry in a POST /v1/sessions/:id/events batch.
type ClientEvent struct {
	Type string `json:"type"`

	// user.message
	Content   []contentBlock `json:"content,omitempty"`
	DeliverAs string         `json:"deliverAs,omitempty"`

	// user.tool_confirmation
	ToolUseID string `json:"toolUseId,omitempty"`
	Result    string `json:"result,omitempty"`
	Reason    string `json:"reason,omitempty"`
}

type contentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// Delivery timing for a user message.
const (
	// DeliverSteer lands at the next turn boundary, redirecting work already in
	// flight. This is what a person typing into the notch expects.
	DeliverSteer = "steer"
	// DeliverFollowUp is held until the agent stops entirely — "and then do X".
	DeliverFollowUp = "followUp"
)

// How a pending tool call is answered. The two "always" forms allow this call
// and remember the decision, which is what the approve-and-stop-asking keybind
// binds to.
const (
	ApproveOnce    = "allow"
	ApproveDeny    = "deny"
	ApproveSession = "always_session"
	ApproveProject = "always_project"
)

// ValidApproval reports whether a string is one of nib's four confirmation
// results, so a bad keybind payload is rejected here rather than by nib.
func ValidApproval(result string) bool {
	switch result {
	case ApproveOnce, ApproveDeny, ApproveSession, ApproveProject:
		return true
	}
	return false
}

func UserMessage(text, deliverAs string) ClientEvent {
	if deliverAs == "" {
		deliverAs = DeliverSteer
	}
	return ClientEvent{
		Type:      "user.message",
		Content:   []contentBlock{{Type: "text", Text: text}},
		DeliverAs: deliverAs,
	}
}

func UserInterrupt() ClientEvent {
	return ClientEvent{Type: "user.interrupt"}
}

func UserToolConfirmation(toolUseID, result, reason string) ClientEvent {
	return ClientEvent{
		Type:      "user.tool_confirmation",
		ToolUseID: toolUseID,
		Result:    result,
		Reason:    reason,
	}
}

// Event is one server frame off the session stream.
type Event struct {
	Seq  int    `json:"seq"`
	ID   string `json:"id"`
	Type string `json:"type"`

	// session.status_idle / status_terminated
	StopReason string `json:"stopReason,omitempty"`

	// agent.message_delta, agent.thinking_delta
	Text string `json:"text,omitempty"`

	// agent.tool_use, agent.tool_result, agent.tool_progress
	ToolUseID  string          `json:"toolUseId,omitempty"`
	Name       string          `json:"name,omitempty"`
	Input      json.RawMessage `json:"input,omitempty"`
	Permission string          `json:"permission,omitempty"`
	IsError    bool            `json:"isError,omitempty"`

	// agent.message_end carries content blocks; agent.tool_result carries a
	// string. Both arrive under "content", so it stays raw until a caller that
	// knows the event type looks at it.
	Content json.RawMessage `json:"content,omitempty"`

	// session.error / session.notice / agent.tool_progress
	Message string `json:"message,omitempty"`

	// ui.surface — an extension's own declarative UI.
	SurfaceID string          `json:"surfaceId,omitempty"`
	Slot      string          `json:"slot,omitempty"`
	View      json.RawMessage `json:"view,omitempty"`
}

// Server event type names, as they appear on the wire.
const (
	EventStatusRunning    = "session.status_running"
	EventStatusIdle       = "session.status_idle"
	EventStatusTerminated = "session.status_terminated"
	EventMessageStart     = "agent.message_start"
	EventMessageDelta     = "agent.message_delta"
	EventMessageEnd       = "agent.message_end"
	EventThinkingDelta    = "agent.thinking_delta"
	EventToolUse          = "agent.tool_use"
	EventToolResult       = "agent.tool_result"
	EventToolProgress     = "agent.tool_progress"
	EventToolUseEdited    = "agent.tool_use_edited"
	EventError            = "session.error"
	EventNotice           = "session.notice"
	EventSurface          = "ui.surface"
)

// Reasons a session went idle. Only "requires_action" means the turn is still
// alive — the loop is parked waiting for a human, not finished.
const (
	IdleEndTurn        = "end_turn"
	IdleRequiresAction = "requires_action"
	IdleAborted        = "aborted"
	IdleError          = "error"
)

// TextContent extracts the plain text from an agent.message_end content array,
// ignoring tool-use blocks. Useful for the final, authoritative reply text when
// deltas were missed across a reconnect.
func TextContent(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var blocks []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	}
	if err := json.Unmarshal(raw, &blocks); err != nil {
		return ""
	}
	var text string
	for _, block := range blocks {
		if block.Type == "text" {
			text += block.Text
		}
	}
	return text
}

// ResultText decodes an agent.tool_result's content, which nib sends as a bare
// JSON string rather than a block array.
func ResultText(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var text string
	if err := json.Unmarshal(raw, &text); err == nil {
		return text
	}
	return string(raw)
}
