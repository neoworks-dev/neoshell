package voice

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/neoworks/neoshell/internal/config"
)

// Deps are the collaborators the Manager needs, injected by the server so this
// package never depends on it.
type Deps struct {
	Broadcast func(topic string, data any)
	Responder Responder
	Config    *config.Store
}

// Manager owns the voice pipeline: the two sidecars and the turn state machine.
type Manager struct {
	deps Deps

	stt     *sttClient
	tts     *ttsClient
	sttSide *sidecar
	ttsSide *sidecar

	mu         sync.Mutex
	started    bool
	turnCancel context.CancelFunc
	currentGen string
	genCounter int
	state      State

	done chan struct{}
}

func New(deps Deps) *Manager {
	return &Manager{deps: deps, done: make(chan struct{}), state: StateIdle}
}

// Start spawns the sidecars and begins the pipeline. Best-effort: if a sidecar
// fails to launch it logs and returns. Launching the neoshell-voice daemon is
// itself the opt-in, so there is no config gate here.
func (m *Manager) Start() {
	m.mu.Lock()
	if m.started {
		m.mu.Unlock()
		return
	}
	m.mu.Unlock()

	env := m.sidecarEnv()
	sttSide, err := startSidecar("stt", sttModule(), STTSocketPath(), env)
	if err != nil {
		log.Printf("voice: disabled (STT sidecar: %v)", err)
		return
	}
	ttsSide, err := startSidecar("tts", ttsModule(), TTSSocketPath(), env)
	if err != nil {
		log.Printf("voice: disabled (TTS sidecar: %v)", err)
		sttSide.stop()
		return
	}

	m.mu.Lock()
	m.sttSide, m.ttsSide = sttSide, ttsSide
	m.stt = newSTTClient(sttSide)
	m.tts = newTTSClient(ttsSide)
	m.started = true
	m.mu.Unlock()

	m.configureSidecars()
	m.setState(StateIdle, "")

	go m.run()
	go m.watchTTS()

	// Always-on and wake modes capture continuously; push-to-talk waits for the
	// keybind to call StartListening.
	if m.mode() != "ptt" {
		_ = m.stt.Listen()
	}
	log.Printf("voice: pipeline started (mode=%s)", m.mode())
}

// Stop tears down the sidecars and the run loop.
func (m *Manager) Stop() {
	m.mu.Lock()
	started := m.started
	m.started = false
	m.mu.Unlock()
	if !started {
		return
	}
	close(m.done)
	m.cancelTurn()
	if m.sttSide != nil {
		m.sttSide.stop()
	}
	if m.ttsSide != nil {
		m.ttsSide.stop()
	}
}

// StartListening begins (or re-arms) capture — the push-to-talk / CLI entry point.
func (m *Manager) StartListening() {
	if m.stt == nil {
		return
	}
	m.setState(StateListening, "")
	_ = m.stt.Listen()
}

// StopListening ends capture and flushes a final transcript.
func (m *Manager) StopListening() {
	if m.stt != nil {
		_ = m.stt.Stop()
	}
}

// Cancel aborts the current turn and discards any in-progress utterance.
func (m *Manager) Cancel() {
	m.cancelTurn()
	if m.stt != nil {
		_ = m.stt.Cancel()
	}
	if m.tts != nil {
		m.mu.Lock()
		gen := m.currentGen
		m.mu.Unlock()
		if gen != "" {
			_ = m.tts.Flush(gen)
		}
	}
	m.setState(StateIdle, "")
}

func (m *Manager) configureSidecars() {
	_ = m.stt.Configure(sttCommand{
		Mode:         m.mode(),
		Language:     m.cfgString("voice.language", "en"),
		Model:        m.cfgString("voice.sttModel", "medium-streaming-en"),
		WakeWord:     m.cfgString("voice.wakeWord", ""),
		VADThreshold: m.cfgFloat("voice.vad.threshold", 0.5),
		VADSilenceMs: m.cfgInt("voice.vad.silenceMs", 700),
		VADMinMs:     m.cfgInt("voice.vad.minSpeechMs", 200),
	})
	_ = m.tts.Configure(m.cfgString("voice.ttsRefAudio", ""), m.cfgString("voice.ttsVoice", "M1"), m.cfgString("voice.language", "en"))
}

// run consumes STT events for the whole session; TTS events are handled by
// watchTTS and per-turn waitIdle.
func (m *Manager) run() {
	for {
		select {
		case <-m.done:
			return
		case text := <-m.stt.Partials:
			m.deps.Broadcast(topicTranscript, map[string]any{"partial": text})
		case <-m.stt.SpeechStart:
			m.handleBargeIn()
		case text := <-m.stt.Finals:
			m.handleFinal(text)
		case <-m.stt.States:
			// STT-reported states are informational; the Manager owns voice:state.
		case msg := <-m.stt.Errors:
			log.Printf("voice: STT error: %s", msg)
		}
	}
}

func (m *Manager) watchTTS() {
	for {
		select {
		case <-m.done:
			return
		case <-m.tts.SpeakingStart:
			m.setState(StateSpeaking, "")
		case msg := <-m.tts.Errors:
			log.Printf("voice: TTS error: %s", msg)
		}
	}
}

func (m *Manager) mode() string { return m.cfgString("voice.mode", "wake") }

// sidecarEnv passes config-driven settings the Python sidecars read from the
// environment (they can't reach the config store). An explicit
// NEOSHELL_VOICE_DEVICE already set in the environment is left untouched.
func (m *Manager) sidecarEnv() []string {
	env := []string{}
	if os.Getenv("NEOSHELL_VOICE_DEVICE") == "" {
		env = append(env, "NEOSHELL_VOICE_DEVICE="+m.cfgString("voice.device", "cpu"))
	}
	return env
}

func (m *Manager) setState(state State, detail string) {
	m.mu.Lock()
	m.state = state
	m.mu.Unlock()
	payload := map[string]any{"state": string(state)}
	if detail != "" {
		payload["detail"] = detail
	}
	m.deps.Broadcast(topicState, payload)
}

func (m *Manager) cancelTurn() {
	m.mu.Lock()
	if m.turnCancel != nil {
		m.turnCancel()
		m.turnCancel = nil
	}
	m.mu.Unlock()
}

// addressed decides whether a transcript should be answered. In always-on mode
// it asks the fast model; wake and push-to-talk modes are already gated by the
// wake word or the keybind, so they always pass.
func (m *Manager) addressed(text string) bool {
	if m.mode() != "always" {
		return true
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return m.deps.Responder.Addressed(ctx, text)
}

func (m *Manager) nextGen() (string, context.Context) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.turnCancel != nil {
		m.turnCancel()
	}
	m.genCounter++
	gen := fmt.Sprintf("turn-%d", m.genCounter)
	ctx, cancel := context.WithCancel(context.Background())
	m.turnCancel = cancel
	m.currentGen = gen
	return gen, ctx
}

// cfg helpers read the shared config store with a fallback.

func (m *Manager) cfgBool(key string, fallback bool) bool {
	value, ok := m.deps.Config.Get(key)
	if !ok {
		return fallback
	}
	b, ok := value.(bool)
	if !ok {
		return fallback
	}
	return b
}

func (m *Manager) cfgString(key, fallback string) string {
	value, ok := m.deps.Config.Get(key)
	if !ok {
		return fallback
	}
	str, ok := value.(string)
	if !ok || str == "" {
		return fallback
	}
	return str
}

func (m *Manager) cfgInt(key string, fallback int) int {
	value, ok := m.deps.Config.Get(key)
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

func (m *Manager) cfgFloat(key string, fallback float64) float64 {
	value, ok := m.deps.Config.Get(key)
	if !ok {
		return fallback
	}
	switch n := value.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	}
	return fallback
}
