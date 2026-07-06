// Package voice is neoshell's local voice-assistant pipeline. It manages two
// Python sidecars — a Whisper STT sidecar (mic → text) and a Chatterbox TTS
// sidecar (text → speaker) — and orchestrates a two-tier LLM fan-out between
// them: a fast model speaks an instant reply while a slower, tool-capable model
// produces the detailed answer that overrides it.
//
// All LLM work is delegated to a Responder (implemented by the server package,
// which owns internal/ai and the capability registry), so this package never
// imports the server and stays free of an import cycle.
package voice

import (
	"context"

	"github.com/neoworks/neoshell/internal/ai"
)

// State is the assistant's high-level status, broadcast on the voice:state topic
// so the UI can show a listening/thinking/speaking indicator.
type State string

const (
	StateIdle      State = "idle"
	StateListening State = "listening"
	StateThinking  State = "thinking"
	StateSpeaking  State = "speaking"
)

// Hub topics this package broadcasts.
const (
	topicState      = "voice:state"
	topicTranscript = "voice:transcript"
	topicAnswer     = "voice:answer"
)

// Source is a file an answer drew on, forwarded to the UI for citations.
type Source struct {
	Path string `json:"path"`
	Name string `json:"name"`
}

// SlowResult is the tool-capable tier's full answer.
type SlowResult struct {
	Text      string
	UsedTools bool
	Sources   []Source
}

// Responder runs the LLM tiers for a turn. The server implements it, reusing
// internal/ai and the capability tool loop.
type Responder interface {
	// Addressed reports whether a transcript was actually directed at the
	// assistant. Used only in "always" mode to gate always-on capture.
	Addressed(ctx context.Context, text string) bool

	// FastReply streams a brief spoken reply with no tools. Called for its
	// low latency, to fill the gap while the slow tier runs.
	FastReply(ctx context.Context, prompt string, history []ai.Message, onToken func(string)) error

	// SlowReply runs the tool loop then the detailed answer, streaming tokens
	// via onToken (for the UI) and retrieval progress via onStatus. The full
	// text is returned for the TTS tier.
	SlowReply(ctx context.Context, prompt string, history []ai.Message, onToken, onStatus func(string)) (SlowResult, error)
}
