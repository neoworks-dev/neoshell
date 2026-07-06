package voice

import (
	"fmt"
	"os"
)

// The sidecars speak newline-delimited JSON over a persistent unix-socket
// connection: the Go core dials, each Python sidecar serves. Audio never
// crosses the socket — each sidecar owns its own PortAudio device.

// sttCommand is a message the core sends to the STT sidecar.
type sttCommand struct {
	Op           string  `json:"op"` // "listen" | "stop" | "cancel" | "config"
	Mode         string  `json:"mode,omitempty"`
	Language     string  `json:"language,omitempty"`
	Model        string  `json:"model,omitempty"`
	WakeWord     string  `json:"wakeWord,omitempty"`
	VADThreshold float64 `json:"vadThreshold,omitempty"`
	VADSilenceMs int     `json:"vadSilenceMs,omitempty"`
	VADMinMs     int     `json:"vadMinSpeechMs,omitempty"`
}

// sttEvent is a message the STT sidecar sends to the core.
type sttEvent struct {
	Event   string `json:"event"` // "state" | "partial" | "final" | "speech_start" | "error"
	Value   string `json:"value,omitempty"`
	Text    string `json:"text,omitempty"`
	Message string `json:"message,omitempty"`
}

// ttsCommand is a message the core sends to the TTS sidecar. Gen is the turn id,
// so a flush only stops the audio it was meant for.
type ttsCommand struct {
	Op       string `json:"op"` // "speak" | "flush" | "config"
	Gen      string `json:"gen,omitempty"`
	Text     string `json:"text,omitempty"`
	RefAudio string `json:"refAudio,omitempty"`
	Voice    string `json:"voice,omitempty"`
	Language string `json:"language,omitempty"`
}

// ttsEvent is a message the TTS sidecar sends to the core.
type ttsEvent struct {
	Event   string `json:"event"` // "speaking_start" | "idle" | "error"
	Gen     string `json:"gen,omitempty"`
	Message string `json:"message,omitempty"`
}

func runtimeDir() string {
	if dir := os.Getenv("XDG_RUNTIME_DIR"); dir != "" {
		return dir
	}
	return fmt.Sprintf("/run/user/%d", os.Getuid())
}

// STTSocketPath is the control socket for the STT sidecar.
func STTSocketPath() string { return runtimeDir() + "/neoshell-voice-stt.sock" }

// TTSSocketPath is the control socket for the TTS sidecar.
func TTSSocketPath() string { return runtimeDir() + "/neoshell-voice-tts.sock" }

// pythonBin resolves the interpreter for the sidecars: NEOSHELL_VOICE_PYTHON,
// else python3 on PATH.
func pythonBin() string {
	if bin := os.Getenv("NEOSHELL_VOICE_PYTHON"); bin != "" {
		return bin
	}
	return "python3"
}

func sttModule() string {
	if module := os.Getenv("NEOSHELL_VOICE_STT_MODULE"); module != "" {
		return module
	}
	return "neoshell_voice.stt"
}

func ttsModule() string {
	if module := os.Getenv("NEOSHELL_VOICE_TTS_MODULE"); module != "" {
		return module
	}
	return "neoshell_voice.tts"
}
