// Package ai is the chat backend for the palette's AI mode. It streams
// completions from either a local ollama server or an external
// OpenAI-compatible API, chosen by Config.Provider. RAG context is assembled by
// the caller and passed in via BuildMessages, so this package has no dependency
// on the search subsystem.
package ai

import "context"

// Message is one chat turn.
type Message struct {
	Role    string `json:"role"` // "system" | "user" | "assistant"
	Content string `json:"content"`
}

// Config selects and configures the chat backend.
type Config struct {
	Provider string // "ollama" | "external"
	Model    string
	Endpoint string // external only
	APIKey   string // external only
}

// Chat streams a completion for the given messages, invoking onToken for each
// text chunk. It blocks until the stream ends or ctx is cancelled.
func Chat(ctx context.Context, cfg Config, messages []Message, onToken func(string)) error {
	if cfg.Provider == "external" {
		return streamOpenAI(ctx, cfg, messages, onToken)
	}
	return streamOllama(ctx, cfg, messages, onToken)
}
