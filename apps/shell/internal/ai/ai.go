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

// ToolSpec describes a function the model may call. Parameters is a JSON schema
// object. The shape matches both ollama's and OpenAI's "tools" field.
type ToolSpec struct {
	Type     string       `json:"type"` // always "function"
	Function ToolFunction `json:"function"`
}

type ToolFunction struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
}

// ToolCall is a single tool invocation the model requested.
type ToolCall struct {
	Name      string
	Arguments map[string]any
}

// Completion is one non-streaming model turn: either free text, tool calls, or
// both.
type Completion struct {
	Content   string
	ToolCalls []ToolCall
}

// Chat streams a completion for the given messages, invoking onToken for each
// text chunk. It blocks until the stream ends or ctx is cancelled.
func Chat(ctx context.Context, cfg Config, messages []Message, onToken func(string)) error {
	if cfg.Provider == "external" {
		return streamOpenAI(ctx, cfg, messages, onToken)
	}
	return streamOllama(ctx, cfg, messages, onToken)
}

// Complete runs one non-streaming turn, offering the model the given tools. It
// returns the model's text and any tool calls it requested. Used for the
// tool-use loop and RAG re-ranking, where the full response is needed at once.
func Complete(ctx context.Context, cfg Config, messages []Message, tools []ToolSpec) (Completion, error) {
	if cfg.Provider == "external" {
		return completeOpenAI(ctx, cfg, messages, tools)
	}
	return completeOllama(ctx, cfg, messages, tools)
}
