# neoshell-voice

Local voice-assistant sidecars for neoshell. Two Python processes the Go core
spawns and supervises (like the search daemon):

- **STT** (`neoshell_voice.stt`) — mic capture → Silero VAD segmentation →
  faster-whisper transcription.
- **TTS** (`neoshell_voice.tts`) — Chatterbox synthesis → speaker playback.

The Go core (`apps/shell/internal/voice`) owns the orchestration: it runs the
two-tier LLM fan-out (fast model for an instant reply, slow tool-capable model
for the detailed answer) and drives these sidecars over unix sockets. Nothing
here talks to Ollama or the LLM directly.

## Setup

```sh
task voice:setup          # uv sync → apps/voice/.venv
task voice:models         # ollama pull gemma4:e2b gemma4:e4b
```

GPU is strongly recommended. `chatterbox-tts` and `faster-whisper` pull in
`torch`; on CUDA install the matching torch build in the venv, e.g.

```sh
cd apps/voice
uv pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
```

Whisper and Chatterbox weights download to `$XDG_DATA_HOME/neoshell/models` on
first run. Enable the feature by setting `voice.enabled: true` in
`~/.config/neoshell/config.json` (or via the settings UI).

## Protocol

Persistent unix-socket connection per sidecar, newline-delimited JSON, one
object per line. The Go core dials; the sidecar serves. Sockets:
`$XDG_RUNTIME_DIR/neoshell-voice-{stt,tts}.sock`.

### STT

Core → sidecar:

```json
{"op":"config","mode":"wake","language":"en","model":"distil-small.en","vadThreshold":0.5,"vadSilenceMs":700,"vadMinSpeechMs":200,"wakeWord":""}
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
{"op":"config","refAudio":"/path/voice.wav","voice":"default"}
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

## Voice cloning

Default uses Chatterbox's built-in voice. To clone a voice, drop a 6–10s clean
reference clip in `voices/` and point `voice.ttsRefAudio` at it.

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
