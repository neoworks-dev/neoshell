package voice

import (
	"context"
	"strings"
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
	m.setState(StateThinking, "")
	go m.runTurn(ctx, gen, prompt)
}

// runTurn speaks the agent's reply as it arrives, sentence by sentence.
//
// There is no speculative fast tier any more. It existed because a small local
// model could answer instantly while a larger one caught up; against a backend
// that calls tools and asks permission, a guessed answer is worse than a pause —
// it would speak something the tool call then contradicts.
func (m *Manager) runTurn(ctx context.Context, gen, prompt string) {
	defer func() {
		if ctx.Err() == nil {
			m.finishTurn(gen)
		}
	}()

	feeder := newFeeder(m.tts, gen)
	spoke := false

	onStatus := func(status string) {
		m.deps.Broadcast(topicTranscript, map[string]any{"status": status})
	}
	onToken := func(token string) {
		m.deps.Broadcast(topicAnswer, map[string]any{"gen": gen, "token": token, "done": false})
		// Move to "speaking" on the first token rather than when audio starts:
		// the sentence is already queued, and the indicator should lead the
		// sound rather than trail it.
		if !spoke {
			spoke = true
			m.setState(StateSpeaking, "")
		}
		feeder.push(token)
	}

	result, err := m.deps.Responder.Reply(ctx, prompt, onToken, onStatus)
	if ctx.Err() != nil {
		return
	}
	if err != nil {
		m.deps.Broadcast(topicAnswer, map[string]any{"gen": gen, "done": true, "error": err.Error()})
		return
	}
	feeder.flush()
	m.deps.Broadcast(topicAnswer, map[string]any{"gen": gen, "done": true, "sources": result.Sources})

	if m.tts != nil {
		m.tts.waitIdle(ctx, gen)
	}
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
