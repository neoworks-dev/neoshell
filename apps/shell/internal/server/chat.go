package server

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/neoworks/neoshell/internal/ai"
)

// handleChat answers an ai:chat request: it builds RAG context from the search
// index, streams the model's reply token by token as ai:chunk messages, and
// sends a final done marker (with an error, if any). Runs in its own goroutine.
func (s *Server) handleChat(c *Client, msg InMessage) {
	if !s.cfgBool("plugins.providers.chat", true) {
		s.sendChunk(c, msg.ID, "", true, "AI chat is disabled")
		return
	}

	contextText := s.ragContext(msg.Prompt)
	messages := ai.BuildMessages(contextText, msg.History, msg.Prompt)

	err := ai.Chat(context.Background(), s.aiConfig(), messages, func(token string) {
		s.sendChunk(c, msg.ID, token, false, "")
	})
	if err != nil {
		s.sendChunk(c, msg.ID, "", true, err.Error())
		return
	}
	s.sendChunk(c, msg.ID, "", true, "")
}

func (s *Server) sendChunk(c *Client, id, token string, done bool, errMsg string) {
	payload := map[string]any{"id": id, "token": token, "done": done}
	if errMsg != "" {
		payload["error"] = errMsg
	}
	data, _ := json.Marshal(OutMessage{Type: "ai:chunk", Data: payload})
	c.Send(data)
}

func (s *Server) aiConfig() ai.Config {
	return ai.Config{
		Provider: s.cfgString("ai.provider", "ollama"),
		Model:    s.cfgString("ai.model", "llama3.1"),
		Endpoint: s.cfgString("ai.endpoint", ""),
		APIKey:   s.cfgString("ai.apiKey", ""),
	}
}

// ragContext gathers the top-K search hits for the prompt into a context block
// (path + snippet per line) for the model to ground its answer and cite.
func (s *Server) ragContext(prompt string) string {
	topK := s.cfgInt("ai.ragTopK", 6)
	if topK <= 0 || strings.TrimSpace(prompt) == "" {
		return ""
	}
	hits := s.searchFiles(prompt)
	if len(hits) > topK {
		hits = hits[:topK]
	}
	var builder strings.Builder
	for _, hit := range hits {
		snippet := hit.Snippet
		if snippet == "" {
			snippet = hit.Name
		}
		fmt.Fprintf(&builder, "- %s\n  %s\n", hit.Path, snippet)
	}
	return builder.String()
}

func (s *Server) cfgString(key, fallback string) string {
	value, ok := s.cfg.Get(key)
	if !ok {
		return fallback
	}
	str, ok := value.(string)
	if !ok || str == "" {
		return fallback
	}
	return str
}

func (s *Server) cfgBool(key string, fallback bool) bool {
	value, ok := s.cfg.Get(key)
	if !ok {
		return fallback
	}
	b, ok := value.(bool)
	if !ok {
		return fallback
	}
	return b
}

func (s *Server) cfgInt(key string, fallback int) int {
	value, ok := s.cfg.Get(key)
	if !ok {
		return fallback
	}
	switch n := value.(type) {
	case float64:
		return int(n)
	case int:
		return n
	}
	return fallback
}
