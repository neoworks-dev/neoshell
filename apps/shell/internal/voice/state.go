// Package voice is neoshell's voice pipeline: two Python sidecars — STT
// (mic → text) and TTS (text → speaker) — with a state machine between them
// handling wake words, endpointing, and barge-in.
//
// It owns the microphone and nothing else. The answer comes from a Responder,
// implemented by the neoshell-voice daemon as a client of the core, which in
// turn drives the agent backend. That indirection is why this package never
// imports the server and never sees a model.
//
// It also holds no conversation history. The agent backend owns the transcript;
// sending our own alongside would put every turn into the prompt twice.
package voice

import "context"

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

// Result is one completed turn.
type Result struct {
	Text    string
	Sources []Source
}

// Responder answers a turn. The neoshell-voice daemon implements it as a client
// of the core's WebSocket route, so the agent session — and every tool it can
// reach — stays in the core process.
type Responder interface {
	// Addressed reports whether a transcript was actually directed at the
	// assistant. Used only in "always" mode to gate always-on capture.
	Addressed(ctx context.Context, text string) bool

	// Reply runs one agent turn. onToken receives the reply as it streams, for
	// the UI and the TTS feeder; onStatus receives tool activity worth showing.
	// It returns when the turn ends, or when ctx is cancelled by a barge-in.
	Reply(ctx context.Context, prompt string, onToken, onStatus func(string)) (Result, error)
}
