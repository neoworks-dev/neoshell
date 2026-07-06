package server

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"unicode/utf8"

	"github.com/neoworks/neoshell/internal/ai"
)

// source is a file the answer drew on, sent to the client so it can render a
// clickable citation.
type source struct {
	Path string `json:"path"`
	Name string `json:"name"`
}

// handleChat answers an ai:chat request: it finds and reads relevant files as RAG
// context (emitting status so the UI can show what's being read), optionally runs
// a tool-use loop, then streams the model's reply token by token as ai:chunk
// messages and a final done marker. The whole request is cancellable via
// ai:cancel. Runs in its own goroutine.
func (s *Server) handleChat(c *Client, msg InMessage) {
	if !s.cfgBool("plugins.providers.chat", true) {
		s.sendChunk(c, msg.ID, "", true, "AI chat is disabled")
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	s.registerChat(msg.ID, cancel)
	defer s.unregisterChat(msg.ID)

	s.beginActivity()
	defer s.endActivity()

	cfg := s.aiConfig()
	toolsEnabled := s.cfgBool("ai.tools", true)

	// With tools on, the model drives retrieval (it calls search_files only when a
	// question actually needs files), so we skip the unconditional RAG pass and its
	// rerank round. With tools off, auto-RAG grounds every answer.
	var contextText string
	var sources []source
	if !toolsEnabled {
		contextText, sources = s.readContext(ctx, c, msg.ID, msg.Prompt)
	}

	messages := ai.BuildMessages(contextText, msg.History, msg.Prompt)
	var expert string
	if toolsEnabled {
		statusFn := func(status string) { s.sendStatus(c, msg.ID, status) }
		messages, sources, expert = s.runToolLoop(ctx, statusFn, cfg, messages, sources)
	}

	s.sendSources(c, msg.ID, sources)

	// The model delegated to the expert; stream that answer instead of a local
	// generation.
	if expert != "" {
		s.sendChunk(c, msg.ID, expert, false, "")
		s.sendChunk(c, msg.ID, "", true, "")
		return
	}

	err := ai.Chat(ctx, cfg, messages, func(token string) {
		s.sendChunk(c, msg.ID, token, false, "")
	})
	// A cancelled stream is not an error to surface — just close it cleanly.
	if err != nil && ctx.Err() == nil {
		s.sendChunk(c, msg.ID, "", true, err.Error())
		return
	}
	s.sendChunk(c, msg.ID, "", true, "")
}

// registerChat records a chat's cancel func so ai:cancel can stop it.
func (s *Server) registerChat(id string, cancel context.CancelFunc) {
	if id == "" {
		return
	}
	s.chatMu.Lock()
	s.chatCancels[id] = cancel
	s.chatMu.Unlock()
}

func (s *Server) unregisterChat(id string) {
	s.chatMu.Lock()
	delete(s.chatCancels, id)
	s.chatMu.Unlock()
}

func (s *Server) cancelChat(id string) {
	s.chatMu.Lock()
	cancel := s.chatCancels[id]
	s.chatMu.Unlock()
	if cancel != nil {
		cancel()
	}
}

// beginActivity/endActivity ref-count in-flight chats and broadcast the global
// "AI is thinking" state the notch shows.
func (s *Server) beginActivity() {
	s.chatMu.Lock()
	s.chatActive++
	s.chatMu.Unlock()
	s.broadcastActivity("Thinking…")
}

func (s *Server) endActivity() {
	s.chatMu.Lock()
	s.chatActive--
	s.chatMu.Unlock()
	s.broadcastActivity("")
}

func (s *Server) broadcastActivity(status string) {
	s.chatMu.Lock()
	active := s.chatActive > 0
	s.chatMu.Unlock()
	s.hub.Broadcast("ai:activity", map[string]any{"active": active, "status": status})
}

func (s *Server) sendChunk(c *Client, id, token string, done bool, errMsg string) {
	payload := map[string]any{"id": id, "token": token, "done": done}
	if errMsg != "" {
		payload["error"] = errMsg
	}
	data, _ := json.Marshal(OutMessage{Type: "ai:chunk", Data: payload})
	c.Send(data)
}

// sendStatus reports retrieval progress (e.g. "Reading report.md…") for a chat
// request, shown transiently in the UI until the answer starts streaming. It
// also mirrors the status to the global activity indicator.
func (s *Server) sendStatus(c *Client, id, status string) {
	data, _ := json.Marshal(OutMessage{Type: "ai:chunk", Data: map[string]any{
		"id":     id,
		"status": status,
	}})
	c.Send(data)
	s.broadcastActivity(status)
}

// sendSources tells the client which files the answer used, for clickable
// citations.
func (s *Server) sendSources(c *Client, id string, sources []source) {
	if len(sources) == 0 {
		return
	}
	data, _ := json.Marshal(OutMessage{Type: "ai:chunk", Data: map[string]any{
		"id":      id,
		"sources": dedupeSources(sources),
	}})
	c.Send(data)
}

// readContext finds the top-K files for the prompt and reads their contents into
// a context block for the model to ground its answer and cite. When re-ranking
// is enabled it asks the model to order a wider candidate set first. Emits a
// status per file so the UI can show which document is being read.
func (s *Server) readContext(ctx context.Context, c *Client, id, prompt string) (string, []source) {
	topK := s.cfgInt("ai.ragTopK", 6)
	if topK <= 0 || strings.TrimSpace(prompt) == "" {
		return "", nil
	}
	s.sendStatus(c, id, "Searching your files…")
	hits := fileHits(s.searchFiles(prompt))
	if len(hits) == 0 {
		return "", nil
	}

	if s.cfgBool("ai.rerank", true) && len(hits) > topK {
		s.sendStatus(c, id, "Ranking results…")
		hits = s.rerankFiles(prompt, hits, topK)
	} else {
		hits = capHits(hits, topK)
	}

	var builder strings.Builder
	var sources []source
	for _, hit := range hits {
		s.sendStatus(c, id, "Reading "+hit.Name+"…")
		content := readCappedFile(hit.Path, 6000)
		if content == "" {
			content = hit.Snippet
		}
		fmt.Fprintf(&builder, "### %s\n%s\n\n", hit.Path, content)
		sources = append(sources, source{Path: hit.Path, Name: hit.Name})
	}
	return builder.String(), sources
}

// readCappedFile returns up to max bytes of a UTF-8 text file, or "" for
// directories, unreadable files, or binary content.
func readCappedFile(path string, max int) string {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return ""
	}
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer file.Close()
	buffer := make([]byte, max)
	n, err := file.Read(buffer)
	if err != nil && n == 0 {
		return ""
	}
	content := buffer[:n]
	if !utf8.Valid(content) {
		return ""
	}
	return string(content)
}

func (s *Server) aiConfig() ai.Config {
	return ai.Config{
		Provider: s.cfgString("ai.provider", "ollama"),
		Model:    s.cfgString("ai.model", "llama3.1"),
		Endpoint: s.cfgString("ai.endpoint", ""),
		APIKey:   s.cfgString("ai.apiKey", ""),
	}
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
