package server

import (
	"context"
	"strings"

	"github.com/neoworks/neoshell/internal/ai"
	"github.com/neoworks/neoshell/internal/voice"
)

// voiceResponder adapts the server's AI backend (internal/ai + the capability
// tool loop) to the voice pipeline's Responder interface, so the voice package
// reuses the same models and tools as text chat without importing the server.
type voiceResponder struct{ s *Server }

const addressivityPrompt = "You are the gate for a voice assistant. Decide whether the user's utterance " +
	"was addressed TO the assistant (a request, question, or command directed at it) or was just " +
	"background speech not meant for it. Answer with a single word: yes or no."

const fastVoicePrompt = "You are a voice assistant. Answer in one short, natural spoken sentence — no lists, " +
	"no markdown, no code. If the request needs a lookup you cannot do instantly, give a brief acknowledgement instead."

// Addressed asks the fast model whether an utterance was meant for the assistant.
func (r voiceResponder) Addressed(ctx context.Context, text string) bool {
	messages := []ai.Message{
		{Role: "system", Content: addressivityPrompt},
		{Role: "user", Content: text},
	}
	var out strings.Builder
	if err := ai.Chat(ctx, r.s.voiceFastConfig(), messages, func(token string) {
		out.WriteString(token)
	}); err != nil {
		// On classifier failure, fail open so the user is never ignored.
		return true
	}
	answer := strings.ToLower(strings.TrimSpace(out.String()))
	return strings.HasPrefix(answer, "yes")
}

// FastReply streams the instant, tool-free spoken reply from the fast model.
func (r voiceResponder) FastReply(ctx context.Context, prompt string, history []ai.Message, onToken func(string)) error {
	messages := make([]ai.Message, 0, len(history)+2)
	messages = append(messages, ai.Message{Role: "system", Content: fastVoicePrompt})
	messages = append(messages, history...)
	messages = append(messages, ai.Message{Role: "user", Content: prompt})
	return ai.Chat(ctx, r.s.voiceFastConfig(), messages, onToken)
}

// SlowReply runs the tool loop then streams the detailed answer from the slow
// model, returning the full text for the TTS tier.
func (r voiceResponder) SlowReply(ctx context.Context, prompt string, history []ai.Message, onToken, onStatus func(string)) (voice.SlowResult, error) {
	cfg := r.s.voiceSlowConfig()
	messages := ai.BuildMessages("", history, prompt)

	var sources []source
	var expert string
	usedTools := false
	if r.s.cfgBool("ai.tools", true) {
		before := len(messages)
		messages, sources, expert = r.s.runToolLoop(ctx, onStatus, cfg, messages, sources)
		usedTools = len(messages) > before
	}

	// Expert delegation: speak that answer directly instead of a local generation.
	if expert != "" {
		onToken(expert)
		return voice.SlowResult{Text: expert, UsedTools: true, Sources: toVoiceSources(sources)}, nil
	}

	var out strings.Builder
	err := ai.Chat(ctx, cfg, messages, func(token string) {
		out.WriteString(token)
		onToken(token)
	})
	return voice.SlowResult{
		Text:      out.String(),
		UsedTools: usedTools,
		Sources:   toVoiceSources(sources),
	}, err
}

func toVoiceSources(sources []source) []voice.Source {
	deduped := dedupeSources(sources)
	if len(deduped) == 0 {
		return nil
	}
	out := make([]voice.Source, 0, len(deduped))
	for _, item := range deduped {
		out = append(out, voice.Source{Path: item.Path, Name: item.Name})
	}
	return out
}

// voiceFastConfig / voiceSlowConfig reuse the base AI config but swap in the
// fast/slow models, falling back to ai.model when unset.
func (s *Server) voiceFastConfig() ai.Config {
	cfg := s.aiConfig()
	cfg.Model = s.cfgString("ai.fastModel", cfg.Model)
	return cfg
}

func (s *Server) voiceSlowConfig() ai.Config {
	cfg := s.aiConfig()
	cfg.Model = s.cfgString("ai.slowModel", cfg.Model)
	return cfg
}

// handleVoiceControl dispatches a voice control action from either a voice:* WS
// message or a voice:* control event (`neoshell emit`).
func (s *Server) handleVoiceControl(action string) {
	if s.voice == nil {
		return
	}
	switch action {
	case "listen":
		s.voice.StartListening()
	case "stop":
		s.voice.StopListening()
	case "cancel":
		s.voice.Cancel()
	}
}
