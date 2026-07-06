package server

import (
	"context"
	"os/exec"
	"strings"
	"time"

	"github.com/neoworks/neoshell/internal/ai"
)

// escalateTimeout bounds an expert call so a hung backend can't stall a turn.
const escalateTimeout = 120 * time.Second

const expertSystemPrompt = "You are an expert assistant answering a question delegated by a smaller local model " +
	"because it judged the task too complex. Answer thoroughly and correctly. Keep it suitable for spoken delivery: " +
	"prose, no code fences or markdown tables unless essential."

// escalate hands a hard question to a more capable expert backend (the Claude
// Code CLI or a configured external provider) and returns its answer. Returns ""
// on any failure or when escalation is disabled, so the caller falls back to the
// local model. Not the default path — the model opts in via the ask_expert tool.
func (s *Server) escalate(ctx context.Context, question string, statusFn func(string)) string {
	if strings.TrimSpace(question) == "" || !s.cfgBool("ai.escalate.enabled", true) {
		return ""
	}
	statusFn("Asking the expert…")

	ctx, cancel := context.WithTimeout(ctx, escalateTimeout)
	defer cancel()

	switch s.cfgString("ai.escalate.backend", "claude-code") {
	case "claude-code":
		return s.escalateClaudeCode(ctx, question)
	case "external":
		return s.escalateExternal(ctx, question)
	}
	return ""
}

// escalateClaudeCode runs the Claude Code CLI in non-interactive print mode.
func (s *Server) escalateClaudeCode(ctx context.Context, question string) string {
	bin := s.cfgString("ai.escalate.command", "claude")
	cmd := exec.CommandContext(ctx, bin, "-p", expertSystemPrompt+"\n\n"+question)
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// escalateExternal streams from a configured OpenAI/Anthropic-compatible endpoint,
// falling back to the base ai.* external settings for any unset escalate key.
func (s *Server) escalateExternal(ctx context.Context, question string) string {
	cfg := ai.Config{
		Provider: "external",
		Model:    s.cfgString("ai.escalate.model", s.cfgString("ai.model", "")),
		Endpoint: s.cfgString("ai.escalate.endpoint", s.cfgString("ai.endpoint", "")),
		APIKey:   s.cfgString("ai.escalate.apiKey", s.cfgString("ai.apiKey", "")),
	}
	if cfg.Endpoint == "" {
		return ""
	}
	messages := []ai.Message{
		{Role: "system", Content: expertSystemPrompt},
		{Role: "user", Content: question},
	}
	var out strings.Builder
	if err := ai.Chat(ctx, cfg, messages, func(token string) {
		out.WriteString(token)
	}); err != nil {
		return ""
	}
	return strings.TrimSpace(out.String())
}
