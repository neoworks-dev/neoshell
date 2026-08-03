"""Moonshine streaming STT sidecar.

Captures the microphone and streams it into Moonshine v2 (ONNX, CPU), which does
its own VAD segmentation and emits transcript lines incrementally. The sidecar
relays those as partial/final transcripts, speech-start events (for barge-in),
and state changes to the Go core.

Streaming (rather than one-shot) is required by the accurate models: the larger
English models (small/medium-streaming) only produce output through the streaming
API; the tiny one-shot models (tiny/base-en) are fast but noticeably less
accurate. Moonshine's internal VAD replaces the Silero segmentation the Whisper
sidecar used.

Moonshine is language-specific (English, Spanish, Mandarin, Japanese, Korean,
Vietnamese, Ukrainian, Arabic). German is not supported — that was the Whisper
era. `model` is a Moonshine model name (e.g. "medium-streaming-en").
"""

import queue
import threading

import numpy as np
import soxr
import sounddevice as sd

from . import config
from .common import SidecarServer, stt_socket_path

SAMPLE_RATE = 16000
# Partial-transcript cadence for the streaming session (seconds).
UPDATE_INTERVAL = 0.3


class STTEngine:
    def __init__(self, server: SidecarServer):
        self.server = server

        # Settings, overridden by the core's `config` op.
        self.mode = "wake"
        self.language = "en"
        self.model_name = "medium-streaming-en"
        self.wake_word = ""
        # VAD thresholds are accepted for protocol compatibility but Moonshine's
        # internal VAD owns segmentation now, so they are advisory only.
        self.vad_threshold = 0.5
        self.silence_ms = 700
        self.min_speech_ms = 200

        self._model = None
        self._ready = False
        self._want_listen = False

        self._audio_queue: "queue.Queue[np.ndarray]" = queue.Queue()
        self._stream = None
        self._feed_worker = None
        self._running = False
        self._capture_rate = SAMPLE_RATE

        # Streaming state. `_speaking` dedupes the speech_start event across the
        # many LineStarted callbacks of one utterance. `_ptt_lines` accumulates
        # completed lines so a push-to-talk hold finalizes as a single utterance.
        self._speaking = False
        self._ptt_lines: list[str] = []
        # Moonshine event classes, bound in load() to avoid a top-level import.
        self._ev_started = None
        self._ev_completed = None
        self._ev_partial = ()

    # --- lifecycle ---------------------------------------------------------

    def load(self) -> None:
        import moonshine_voice as moonshine
        from moonshine_voice import (
            LineCompleted,
            LineStarted,
            LineTextChanged,
            LineUpdated,
        )

        model_path, model_arch = self._resolve_model(moonshine)
        arch_name = moonshine.model_arch_to_string(model_arch)
        self.server.log(f"loading Moonshine {self.model_name} ({arch_name})")
        self._model = moonshine.Transcriber(
            model_path=model_path,
            model_arch=model_arch,
            update_interval=UPDATE_INTERVAL,
        )
        self._ev_started = LineStarted
        self._ev_completed = LineCompleted
        self._ev_partial = (LineUpdated, LineTextChanged)
        self._model.add_listener(self._on_event)
        self._ready = True
        self.server.log("STT ready")
        if self._want_listen:
            self.start()

    def _resolve_model(self, moonshine):
        """Resolve the configured model name to a Moonshine model path + arch,
        downloading it on first use. An unknown name falls back to the language
        default. Streaming archs (small/medium) are the accurate choice for a
        continuous mic feed, so that is the default when the name is unknown."""
        from moonshine_voice import ModelArch

        language = self.language or "en"
        wanted_arch = ModelArch.MEDIUM_STREAMING
        for info in moonshine.download.MODEL_INFO.get(language, {}).get("models", []):
            if info["model_name"] == self.model_name:
                wanted_arch = info["model_arch"]
                break
        model_name, model_arch = moonshine.get_model_for_language(language, wanted_arch)
        self.model_name = model_name
        return moonshine.get_model_path(model_name), model_arch

    def handle(self, command: dict) -> None:
        op = command.get("op")
        if op == "config":
            self._configure(command)
        elif op == "listen":
            self._want_listen = True
            self.start()
        elif op == "stop":
            self.stop()
        elif op == "cancel":
            self.stop(discard=True)

    def _configure(self, command: dict) -> None:
        self.mode = command.get("mode", self.mode)
        self.language = command.get("language", self.language)
        self.wake_word = (command.get("wakeWord") or "").strip().lower()
        if command.get("vadThreshold"):
            self.vad_threshold = float(command["vadThreshold"])
        if command.get("vadSilenceMs"):
            self.silence_ms = int(command["vadSilenceMs"])
        if command.get("vadMinSpeechMs"):
            self.min_speech_ms = int(command["vadMinSpeechMs"])
        # A model change takes effect on the next process start; reloading a live
        # Moonshine ONNX session mid-session is avoided for simplicity.
        self.model_name = command.get("model", self.model_name)

    def start(self) -> None:
        if not self._ready or self._running:
            return
        self._running = True
        self._speaking = False
        self._ptt_lines = []
        self._model.start()  # open the streaming session (internal VAD)
        self._feed_worker = threading.Thread(target=self._feed_loop, daemon=True)
        self._feed_worker.start()
        try:
            self._stream = self._open_input()
        except Exception as error:
            self._running = False
            self.server.emit(event="error", message=f"no usable mic: {error}")
            return
        self.server.emit(event="state", value="listening")

    def _open_input(self):
        """Open the first mic that actually works. PortAudio's pulse/pipewire
        PCMs often fail (PaErrorCode -9999); raw hw devices still open. Capture at
        the device's native rate — 16 kHz is forced later in software."""
        for device in self._input_candidates():
            try:
                info = sd.query_devices(device, kind="input")
                rate = int(info["default_samplerate"])
                stream = sd.InputStream(
                    samplerate=rate,
                    channels=1,
                    dtype="float32",
                    device=device,
                    callback=self._on_audio,
                )
                stream.start()
                self._capture_rate = rate
                self.server.log(f"mic: {info['name']} @ {rate} Hz")
                return stream
            except Exception:
                continue
        raise RuntimeError("no input device could be opened")

    def _input_candidates(self) -> list:
        """Prefer the sound-server routes (pipewire/pulse/default). They follow
        the system default source and negotiate rate inside the server, avoiding
        the raw-ALSA hw config failures ('Expression r failed ... capture'). Raw
        hw indices come last — they open even when silent (e.g. an unplugged
        motherboard jack), so they must not shadow the real default source."""
        candidates: list = []
        configured = config.input_device()
        if configured is not None:
            candidates.append(configured)
        for named in ("pipewire", "pulse", "default"):
            if named not in candidates:
                candidates.append(named)
        candidates.append(None)  # PortAudio default
        for index, info in enumerate(sd.query_devices()):
            if info["max_input_channels"] > 0 and index not in candidates:
                candidates.append(index)
        return candidates

    def stop(self, discard: bool = False) -> None:
        """Stop capture and close the streaming session. A push-to-talk release
        finalizes the held audio as one utterance; `discard` (cancel) drops it."""
        if not self._running:
            return
        # Stop capturing first so no new audio enters, then flush the session.
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        self._running = False
        # Any in-flight line completes synchronously here, landing in _ptt_lines
        # (ptt) or emitting its own final (wake/always) via the listener.
        try:
            self._model.stop()
        except Exception:
            pass
        self._speaking = False

        if discard:
            self._ptt_lines = []
            self.server.emit(event="state", value="idle")
            return
        if self.mode == "ptt":
            combined = " ".join(self._ptt_lines).strip()
            self._ptt_lines = []
            self._emit_final(combined)

    # --- capture -----------------------------------------------------------

    def _on_audio(self, indata, frames, time_info, status) -> None:
        mono = indata[:, 0]
        if self._capture_rate != SAMPLE_RATE:
            mono = soxr.resample(mono, self._capture_rate, SAMPLE_RATE)
        self._audio_queue.put(mono.astype(np.float32).copy())

    def _feed_loop(self) -> None:
        """Drain captured audio into the streaming model. Runs off the PortAudio
        callback so transcription work never blocks capture."""
        while self._running:
            try:
                chunk = self._audio_queue.get(timeout=0.1)
            except queue.Empty:
                continue
            try:
                self._model.add_audio(chunk.tolist(), SAMPLE_RATE)
            except Exception as error:
                self.server.emit(event="error", message=str(error))

    # --- transcript events -------------------------------------------------

    def _on_event(self, event) -> None:
        """Listener for Moonshine transcript events (fires on the feed thread).
        LineStarted marks speech onset, partial events stream text as it firms
        up, and LineCompleted finalizes an utterance."""
        line = event.line
        if isinstance(event, self._ev_started):
            if not self._speaking:
                self._speaking = True
                self.server.emit(event="speech_start")
            return
        if isinstance(event, self._ev_partial):
            text = line.text.strip()
            if text:
                self.server.emit(event="partial", text=text)
            return
        if isinstance(event, self._ev_completed):
            self._speaking = False
            self._complete_line(line)

    def _complete_line(self, line) -> None:
        if line.duration * 1000 < self.min_speech_ms:
            return
        text = line.text.strip()
        # Push-to-talk finalizes on key release, so hold completed lines until then.
        if self.mode == "ptt":
            if text:
                self._ptt_lines.append(text)
            return
        self._emit_final(text)

    def _emit_final(self, text: str) -> None:
        text = (text or "").strip()
        if not text:
            self.server.emit(event="state", value="idle")
            return
        if self.mode == "wake" and self.wake_word:
            text = self._strip_wake(text)
            if text is None:
                self.server.emit(event="state", value="idle")
                return
        self.server.emit(event="final", text=text)
        self.server.emit(event="state", value="idle")

    def _strip_wake(self, text: str):
        """Detect the wake word anywhere in the utterance (start, middle, or end)
        and return the command with it removed. Matching is whole-word so "neo"
        does not fire on "neon". Returns None if the wake word is absent, or the
        original text if removing it would leave nothing (bare "neo")."""
        import re

        pattern = re.compile(rf"\b{re.escape(self.wake_word)}\b", re.IGNORECASE)
        if not pattern.search(text):
            return None
        command = pattern.sub(" ", text)
        command = re.sub(r"\s+", " ", command).strip(" ,.!?")
        return command or text


def main() -> None:
    config.setup_caches()
    server = SidecarServer("stt", stt_socket_path())
    engine = STTEngine(server)
    # Load the model in the background so the socket is available immediately and
    # the Go core's dial succeeds while weights are still loading.
    threading.Thread(target=engine.load, daemon=True).start()
    server.serve(engine.handle)


if __name__ == "__main__":
    main()
