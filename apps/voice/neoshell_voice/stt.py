"""Whisper STT sidecar.

Captures the microphone, segments utterances with Silero VAD, and transcribes
each with faster-whisper. Emits partial/final transcripts, speech-start events
(for barge-in), and state changes to the Go core.
"""

import queue
import threading

import numpy as np
import soxr
import sounddevice as sd

from . import config
from .common import SidecarServer, stt_socket_path

SAMPLE_RATE = 16000
FRAME = 512  # Silero v5 expects 512-sample frames at 16 kHz


class STTEngine:
    def __init__(self, server: SidecarServer):
        self.server = server

        # Settings, overridden by the core's `config` op.
        self.mode = "wake"
        self.language = "en"
        self.model_name = "distil-small.en"
        self.wake_word = ""
        self.vad_threshold = 0.5
        self.silence_ms = 700
        self.min_speech_ms = 200

        self._model = None
        self._vad = None
        self._ready = False
        self._want_listen = False

        self._audio_queue: "queue.Queue[np.ndarray]" = queue.Queue()
        self._stream = None
        self._worker = None
        self._running = False
        self._capture_rate = SAMPLE_RATE
        # Set by stop() to finalize the buffered utterance on push-to-talk release.
        self._endpoint = threading.Event()

    # --- lifecycle ---------------------------------------------------------

    def load(self) -> None:
        from faster_whisper import WhisperModel
        from silero_vad import load_silero_vad

        dev = config.device()
        compute = "float16" if dev == "cuda" else "int8"
        self.server.log(f"loading faster-whisper {self.model_name} on {dev} ({compute})")
        self._model = WhisperModel(
            self.model_name,
            device=dev,
            compute_type=compute,
            download_root=str(config.models_dir() / "whisper"),
        )
        self._vad = load_silero_vad()
        self._ready = True
        self.server.log("STT ready")
        if self._want_listen:
            self.start()

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
            self.stop()

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
        # CTranslate2 model mid-session is avoided for simplicity.
        self.model_name = command.get("model", self.model_name)

    def start(self) -> None:
        if not self._ready or self._running:
            return
        self._endpoint.clear()
        self._running = True
        self._worker = threading.Thread(target=self._segment_loop, daemon=True)
        self._worker.start()
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

    def stop(self) -> None:
        if not self._running:
            return
        # Stop capturing first so no new audio enters, then flag end-of-utterance
        # and let the segment loop drain the queue and transcribe what was held.
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        self._endpoint.set()
        self._running = False

    # --- capture + segmentation -------------------------------------------

    def _on_audio(self, indata, frames, time_info, status) -> None:
        mono = indata[:, 0]
        if self._capture_rate != SAMPLE_RATE:
            mono = soxr.resample(mono, self._capture_rate, SAMPLE_RATE)
        self._audio_queue.put(mono.astype(np.float32).copy())

    def _segment_loop(self) -> None:
        speech: list[np.ndarray] = []
        in_speech = False
        silence_frames = 0
        frame_ms = FRAME / SAMPLE_RATE * 1000
        silence_limit = max(1, int(self.silence_ms / frame_ms))
        # Device blocks arrive at arbitrary sizes; buffer and slice into the
        # fixed 512-sample frames Silero requires.
        leftover = np.empty(0, dtype=np.float32)
        # Push-to-talk holds the key for the whole utterance: capture every frame
        # and finalize on release (the endpoint), rather than VAD-segmenting.
        ptt = self.mode == "ptt"

        while True:
            try:
                chunk = self._audio_queue.get(timeout=0.1)
            except queue.Empty:
                chunk = None

            if chunk is not None:
                leftover = np.concatenate([leftover, chunk])
                while len(leftover) >= FRAME:
                    frame = leftover[:FRAME]
                    leftover = leftover[FRAME:]
                    if ptt:
                        if not in_speech:
                            in_speech = True
                            self.server.emit(event="speech_start")
                        speech.append(frame)
                        continue
                    if self._speech_prob(frame) >= self.vad_threshold:
                        if not in_speech:
                            in_speech = True
                            self.server.emit(event="speech_start")
                        speech.append(frame)
                        silence_frames = 0
                        continue
                    if in_speech:
                        speech.append(frame)
                        silence_frames += 1
                        if silence_frames >= silence_limit:
                            self._finalize(np.concatenate(speech))
                            speech, in_speech, silence_frames = [], False, 0
                continue

            # Queue drained. Handle a pending endpoint (push-to-talk release or a
            # manual stop): transcribe the held audio, then exit if stopped.
            if self._endpoint.is_set():
                self._endpoint.clear()
                if speech:
                    self._finalize(np.concatenate(speech))
                else:
                    self.server.emit(event="state", value="idle")
                speech, in_speech, silence_frames = [], False, 0
                leftover = np.empty(0, dtype=np.float32)
            if not self._running:
                return

    def _speech_prob(self, frame: np.ndarray) -> float:
        import torch

        tensor = torch.from_numpy(frame)
        return float(self._vad(tensor, SAMPLE_RATE))

    def _finalize(self, audio: np.ndarray) -> None:
        duration_ms = len(audio) / SAMPLE_RATE * 1000
        if duration_ms < self.min_speech_ms:
            return
        self.server.emit(event="state", value="processing")
        text = self._transcribe(audio).strip()
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

    def _transcribe(self, audio: np.ndarray) -> str:
        segments, _ = self._model.transcribe(audio, language=self.language, beam_size=1)
        return " ".join(segment.text for segment in segments)

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
