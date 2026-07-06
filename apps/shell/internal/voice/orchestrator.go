package voice

import (
	"context"
	"strings"

	"github.com/neoworks/neoshell/internal/ai"
)

// handleFinal turns a finalized transcript into a turn, gated by addressivity.
// A final arriving mid-speech is a wake-word barge-in (see handleBargeIn): the
// STT sidecar only emits finals that contain the wake word, so the assistant's
// own speaker echo never lands here — only the user saying "neo" does.
func (m *Manager) handleFinal(text string) {
	text = strings.TrimSpace(text)
	if text == "" {
		return
	}
	m.deps.Broadcast(topicTranscript, map[string]any{"final": text})
	if !m.addressed(text) {
		m.setState(StateIdle, "")
		return
	}
	m.interruptCurrentTurn()
	m.startTurn(text)
}

// interruptCurrentTurn cuts an in-progress answer so a new wake-word utterance
// can take over: cancel the turn goroutine and flush any queued/playing TTS.
func (m *Manager) interruptCurrentTurn() {
	m.mu.Lock()
	speaking := m.state == StateSpeaking
	gen := m.currentGen
	m.mu.Unlock()
	if !speaking {
		return
	}
	m.cancelTurn()
	if m.tts != nil && gen != "" {
		_ = m.tts.Flush(gen)
	}
}

// handleBargeIn stops the assistant when the user speaks over it. With speakers
// (not headphones) the mic hears the assistant's own voice, so raw VAD speech
// would self-interrupt. In wake mode we ignore VAD entirely and only interrupt
// on a wake-word final (handleFinal → interruptCurrentTurn); other modes keep
// the immediate speech-triggered barge-in.
func (m *Manager) handleBargeIn() {
	if !m.cfgBool("voice.bargeIn", true) {
		return
	}
	if m.mode() == "wake" {
		return
	}
	m.mu.Lock()
	speaking := m.state == StateSpeaking
	gen := m.currentGen
	m.mu.Unlock()
	if !speaking {
		return
	}
	m.cancelTurn()
	if m.tts != nil && gen != "" {
		_ = m.tts.Flush(gen)
	}
	m.setState(StateListening, "")
}

func (m *Manager) startTurn(prompt string) {
	gen, ctx := m.nextGen()
	m.mu.Lock()
	history := append([]ai.Message(nil), m.history...)
	m.mu.Unlock()

	m.setState(StateThinking, "")
	go m.runTurn(ctx, gen, prompt, history)
}

// runTurn is the speculative fan-out: the fast tier speaks immediately while the
// slow, tool-capable tier produces the authoritative answer that overrides it.
func (m *Manager) runTurn(ctx context.Context, gen, prompt string, history []ai.Message) {
	defer func() {
		if ctx.Err() == nil {
			m.finishTurn(gen)
		}
	}()

	var fastText strings.Builder
	if m.cfgBool("voice.fastFillerEnabled", true) {
		feeder := newFeeder(m.tts, gen)
		m.setState(StateSpeaking, "")
		_ = m.deps.Responder.FastReply(ctx, prompt, history, func(token string) {
			fastText.WriteString(token)
			m.deps.Broadcast(topicAnswer, map[string]any{"gen": gen, "token": token, "fast": true, "done": false})
			feeder.push(token)
		})
		feeder.flush()
	}
	if ctx.Err() != nil {
		return
	}

	onStatus := func(status string) {
		m.deps.Broadcast(topicTranscript, map[string]any{"status": status})
	}
	onToken := func(token string) {
		m.deps.Broadcast(topicAnswer, map[string]any{"gen": gen, "token": token, "fast": false, "done": false})
	}
	result, err := m.deps.Responder.SlowReply(ctx, prompt, history, onToken, onStatus)
	if err != nil || ctx.Err() != nil {
		return
	}
	m.deps.Broadcast(topicAnswer, map[string]any{"gen": gen, "done": true, "fast": false, "sources": result.Sources})

	// The slow answer wins when it used tools or diverges from the fast reply;
	// otherwise the fast reply already covered it.
	if m.shouldSpeakSlow(result, fastText.String()) {
		if m.tts != nil {
			_ = m.tts.Flush(gen) // cut any remaining fast audio before the real answer
		}
		m.setState(StateSpeaking, "")
		m.speakAll(gen, result.Text)
	}

	if m.tts != nil {
		m.tts.waitIdle(ctx, gen)
	}
	m.recordHistory(prompt, result.Text)
}

// shouldSpeakSlow decides whether the authoritative answer is spoken over the
// fast reply.
func (m *Manager) shouldSpeakSlow(result SlowResult, fast string) bool {
	if strings.TrimSpace(result.Text) == "" {
		return false
	}
	if result.UsedTools {
		return true
	}
	if !m.cfgBool("voice.fastFillerEnabled", true) {
		return true
	}
	return !similar(fast, result.Text)
}

func (m *Manager) speakAll(gen, text string) {
	feeder := newFeeder(m.tts, gen)
	feeder.push(text)
	feeder.flush()
}

// finishTurn clears turn state and re-arms listening for continuous modes.
func (m *Manager) finishTurn(gen string) {
	m.mu.Lock()
	if m.currentGen == gen {
		m.currentGen = ""
		m.turnCancel = nil
	}
	m.mu.Unlock()
	if m.mode() == "ptt" {
		m.setState(StateIdle, "")
		return
	}
	m.setState(StateListening, "")
}

func (m *Manager) recordHistory(prompt, answer string) {
	const maxTurns = 12
	m.mu.Lock()
	defer m.mu.Unlock()
	m.history = append(m.history, ai.Message{Role: "user", Content: prompt})
	if strings.TrimSpace(answer) != "" {
		m.history = append(m.history, ai.Message{Role: "assistant", Content: answer})
	}
	if len(m.history) > maxTurns*2 {
		m.history = m.history[len(m.history)-maxTurns*2:]
	}
}

// similar reports whether two answers are effectively the same spoken content,
// so the assistant doesn't repeat the fast reply verbatim.
func similar(a, b string) bool {
	na, nb := normalize(a), normalize(b)
	if na == "" || nb == "" {
		return false
	}
	return na == nb || strings.HasPrefix(nb, na) || strings.HasPrefix(na, nb)
}

func normalize(s string) string {
	return strings.ToLower(strings.Join(strings.Fields(s), " "))
}
