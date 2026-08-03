# neoshell-voice

Local voice-assistant sidecars for neoshell. Two Python processes the Go core
spawns and supervises (like the search daemon):

- **STT** (`neoshell_voice.stt`) — mic capture → Moonshine v2 streaming
  transcription (ONNX, CPU) with its own VAD segmentation, emitting live partials
  and finals. Default `medium-streaming-en`. English-only; German unsupported.
- **TTS** (`neoshell_voice.tts`) — Supertonic 3 synthesis (ONNX, CPU) → speaker
  playback. Preset voices F1-F5 / M1-M5, 31 languages, no voice cloning.

The Go core (`apps/shell/internal/voice`) owns the orchestration: it runs the
two-tier LLM fan-out (fast model for an instant reply, slow tool-capable model
for the detailed answer) and drives these sidecars over unix sockets. Nothing
here talks to Ollama or the LLM directly.

## Setup

```sh
task voice:setup          # uv sync → apps/voice/.venv
task voice:models         # ollama pull gemma4:e2b gemma4:e4b
```

The sidecars default to **CPU** (`voice.device: cpu`). Supertonic 3 runs well
under realtime there (RTF ~0.16-0.30, ~0.4-1.5s per sentence), and CPU keeps the
GPU's VRAM free for the LLM. `voice.device` only affects TTS — Moonshine STT is
CPU-only regardless. For a GPU box, set `voice.device: cuda` and overlay the
matching CUDA ONNX runtime after setup:

```sh
cd apps/voice
uv pip install "onnxruntime-gpu==$(uv pip show onnxruntime | awk '/^Version:/{print $2}')"
```

Moonshine and Supertonic weights download to `$XDG_DATA_HOME/neoshell/models` on
first run. Enable the feature by setting `voice.enabled: true` in
`~/.config/neoshell/config.json` (or via the settings UI).

## Protocol

Persistent unix-socket connection per sidecar, newline-delimited JSON, one
object per line. The Go core dials; the sidecar serves. Sockets:
`$XDG_RUNTIME_DIR/neoshell-voice-{stt,tts}.sock`.

### STT

Core → sidecar:

```json
{"op":"config","mode":"wake","language":"en","model":"medium-streaming-en","vadThreshold":0.5,"vadSilenceMs":700,"vadMinSpeechMs":200,"wakeWord":""}
{"op":"listen"}
{"op":"stop"}
{"op":"cancel"}
```

Sidecar → core:

```json
{"event":"state","value":"listening|processing|idle"}
{"event":"partial","text":"..."}
{"event":"final","text":"..."}
{"event":"speech_start"}
{"event":"error","message":"..."}
```

### TTS

Core → sidecar:

```json
{"op":"config","voice":"M1","language":"en"}
{"op":"speak","gen":"turn-42","text":"Let me check that."}
{"op":"flush","gen":"turn-42"}
```

Sidecar → core:

```json
{"event":"speaking_start","gen":"turn-42"}
{"event":"idle","gen":"turn-42"}
{"event":"error","message":"..."}
```

`gen` is a per-turn id so a flush only stops the audio it was meant for.

## Voices

Supertonic 3 ships ten preset voices — `F1`-`F5` (female) and `M1`-`M5` (male) —
selected with `voice.ttsVoice` (default `M1`). An unknown name logs a warning and
falls back to `M1`.

Supertonic has no voice cloning, so `voice.ttsRefAudio` is unused; the Go core
still sends it over the config op and the sidecar ignores it. `voice.language`
picks the language (31 supported); anything else falls back to English.

## Manual testing

```sh
task voice:stt   # run the STT sidecar alone
# in another shell:
socat - UNIX-CONNECT:$XDG_RUNTIME_DIR/neoshell-voice-stt.sock
# then type: {"op":"listen"} and speak

task voice:tts
socat - UNIX-CONNECT:$XDG_RUNTIME_DIR/neoshell-voice-tts.sock
# then type: {"op":"speak","gen":"t1","text":"hello world"}
```
