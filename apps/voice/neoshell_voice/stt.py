"""Whisper STT sidecar.

Captures the microphone, segments speech with Silero VAD, and transcribes each
segment with faster-whisper (CTranslate2, int8, CPU). Whisper has no streaming
decoder, so live partials come from re-decoding the in-progress segment on a
fixed cadence; the authoritative final decode runs when the VAD closes the
segment.

Whisper is multilingual (German included). `language` is an ISO code passed to
the decoder; the special value "auto" enables per-utterance detection. `model`
is a faster-whisper size name (e.g. "small", "large-v3-turbo").
"""

import queue
import threading
import time
from collections import deque

import numpy as np
import soxr
import sounddevice as sd

from . import config
from .common import SidecarServer, stt_socket_path

SAMPLE_RATE = 16000
# Silero VAD operates on fixed 512-sample frames at 16 kHz.
FRAME = 512
# Partial-transcript cadence (seconds). Each partial re-decodes the whole
# in-progress segment, so this bounds the wasted compute per second of speech.
PARTIAL_INTERVAL = 1.0
# Stop re-decoding partials for segments longer than this; the final still
# covers the full audio. Keeps long monologues from pinning the CPU.
PARTIAL_MAX_SECONDS = 20.0
# Force-close a segment after this long even if the VAD still sees speech.
SEGMENT_MAX_SECONDS = 30.0
# Audio kept from before the VAD onset so word starts are not clipped.
PRE_ROLL_SECONDS = 0.3

DEFAULT_MODEL = "small"
WHISPER_MODELS = {
    "tiny", "tiny.en", "base", "base.en", "small", "small.en",
    "medium", "medium.en", "large-v3", "large-v3-turbo", "distil-large-v3",
}


class STTEngine:
    def __init__(self, server: SidecarServer):
        self.server = server

        # Settings, overridden by the core's `config` op.
        self.mode = "wake"
        self.language = "en"
        self.model_name = DEFAULT_MODEL
        self.wake_word = ""
        self.vad_threshold = 0.5
        self.silence_ms = 700
        self.min_speech_ms = 200

        self._model = None
        self._vad = None
        self._torch = None
        self._ready = False
        self._want_listen = False

        self._audio_queue: "queue.Queue[np.ndarray]" = queue.Queue()
        self._stream = None
        self._feed_worker = None
        self._running = False
        self._capture_rate = SAMPLE_RATE

        # Segment state, owned by the feed thread while it runs and by stop()
        # after the thread is joined.
        self._pre_roll: deque = deque(maxlen=int(PRE_ROLL_SECONDS * SAMPLE_RATE / FRAME))
        self._segment: list[np.ndarray] = []
        self._leftover = np.empty(0, dtype=np.float32)
        self._in_speech = False
        self._silent_frames = 0
        self._last_partial = 0.0
        self._ptt_lines: list[str] = []

    # --- lifecycle ---------------------------------------------------------

    def load(self) -> None:
        import torch
        from faster_whisper import WhisperModel
        from silero_vad import load_silero_vad

        self._torch = torch
        self._vad = load_silero_vad()
        model_name = self._resolve_model_name()
        self.server.log(f"loading Whisper {model_name} (int8, cpu)")
        self._model = WhisperModel(
            model_name,
            device="cpu",
            compute_type="int8",
            download_root=str(config.models_dir() / "whisper"),
        )
        self._ready = True
        self.server.log("STT ready")
        if self._want_listen:
            self.start()

    def _resolve_model_name(self) -> str:
        """Model changes from the `config` op take effect on the next process
        start; reloading a live CTranslate2 session is avoided for simplicity."""
        if self.model_name in WHISPER_MODELS:
            return self.model_name
        self.server.log(f"unknown STT model {self.model_name!r}, using {DEFAULT_MODEL}")
        return DEFAULT_MODEL

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
        self.model_name = command.get("model", self.model_name)

    def start(self) -> None:
        if not self._ready or self._running:
            return
        self._running = True
        self._reset_segment()
        self._ptt_lines = []
        self._vad.reset_states()
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
        """Stop capture and finalize. A push-to-talk release finalizes the held
        audio as one utterance; `discard` (cancel) drops it."""
        self._want_listen = False
        if not self._running:
            return
        # Stop capturing first so no new audio enters, then join the feed
        # thread so segment state is safe to touch from this thread.
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        self._running = False
        if self._feed_worker is not None:
            self._feed_worker.join(timeout=15)
            self._feed_worker = None

        if discard:
            self._reset_segment()
            self._ptt_lines = []
            self.server.emit(event="state", value="idle")
            return
        if self._in_speech:
            self._close_segment()
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
        """Drain captured audio, frame it for the VAD, and drive segmentation.
        Runs off the PortAudio callback so decoding never blocks capture."""
        while self._running:
            try:
                chunk = self._audio_queue.get(timeout=0.1)
            except queue.Empty:
                continue
            self._leftover = np.concatenate([self._leftover, chunk])
            while len(self._leftover) >= FRAME:
                frame = self._leftover[:FRAME]
                self._leftover = self._leftover[FRAME:]
                self._process_frame(frame)

    # --- segmentation ------------------------------------------------------

    def _process_frame(self, frame: np.ndarray) -> None:
        speech = self._vad_probability(frame) >= self.vad_threshold
        if not self._in_speech and not speech:
            self._pre_roll.append(frame)
            return
        if not self._in_speech:
            self._begin_segment(frame)
            return
        self._segment.append(frame)
        if speech:
            self._silent_frames = 0
        else:
            self._silent_frames += 1
        if self._silent_frames >= self._silence_limit():
            self._close_segment()
            return
        if self._segment_seconds() >= SEGMENT_MAX_SECONDS:
            self._close_segment()
            return
        if speech:
            self._maybe_emit_partial()

    def _vad_probability(self, frame: np.ndarray) -> float:
        tensor = self._torch.from_numpy(frame)
        return float(self._vad(tensor, SAMPLE_RATE))

    def _begin_segment(self, frame: np.ndarray) -> None:
        self._segment = list(self._pre_roll) + [frame]
        self._pre_roll.clear()
        self._in_speech = True
        self._silent_frames = 0
        self._last_partial = time.monotonic()
        self.server.emit(event="speech_start")

    def _silence_limit(self) -> int:
        frame_ms = FRAME / SAMPLE_RATE * 1000
        return max(1, int(self.silence_ms / frame_ms))

    def _segment_seconds(self) -> float:
        return len(self._segment) * FRAME / SAMPLE_RATE

    def _reset_segment(self) -> None:
        self._segment = []
        self._leftover = np.empty(0, dtype=np.float32)
        self._pre_roll.clear()
        self._in_speech = False
        self._silent_frames = 0

    def _maybe_emit_partial(self) -> None:
        if time.monotonic() - self._last_partial < PARTIAL_INTERVAL:
            return
        if self._segment_seconds() > PARTIAL_MAX_SECONDS:
            return
        text = self._decode(np.concatenate(self._segment))
        # Stamp after the decode: a decode slower than the interval must not
        # trigger again on the very next frame.
        self._last_partial = time.monotonic()
        if text:
            self.server.emit(event="partial", text=text)

    def _close_segment(self) -> None:
        audio = np.concatenate(self._segment)
        speech_frames = len(self._segment) - self._silent_frames
        speech_ms = speech_frames * FRAME / SAMPLE_RATE * 1000
        self._reset_segment()
        self._vad.reset_states()
        if speech_ms < self.min_speech_ms:
            return
        text = self._decode(audio)
        if self.mode == "ptt":
            if text:
                self._ptt_lines.append(text)
            return
        self._emit_final(text)

    # --- transcription -----------------------------------------------------

    def _decode(self, audio: np.ndarray) -> str:
        language = self.language or "en"
        if language == "auto":
            language = None
        try:
            segments, _info = self._model.transcribe(
                audio,
                language=language,
                beam_size=1,
                condition_on_previous_text=False,
                vad_filter=False,
            )
            parts = [segment.text.strip() for segment in segments]
        except Exception as error:
            self.server.emit(event="error", message=str(error))
            return ""
        return " ".join(part for part in parts if part).strip()

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
