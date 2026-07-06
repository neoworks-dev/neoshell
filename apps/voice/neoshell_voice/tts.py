"""MOSS-TTS-Nano sidecar.

Loads MOSS-TTS-Nano (100M ONNX) once and synthesizes queued sentences (fed by
the Go orchestrator one sentence at a time), playing them through the default
output device. On GPU it is ~1s per sentence (RTF ~0.2) at ~0.3-0.5 GB VRAM, so
it barely competes with the LLM/STT for memory. A flush drops the queue and
stops playback for barge-in / interrupts.

Voice cloning is zero-shot from a reference clip (voice.ttsRefAudio → the
prompt-audio path); with no clip it falls back to a built-in preset. Language is
auto-detected from the text, so no explicit language selection is needed.
"""

import queue
import threading

import numpy as np
import soxr
import sounddevice as sd

from . import config
from .common import SidecarServer, tts_socket_path

# MOSS output is 48 kHz; wetext/tts-text normalization is Chinese/English focused
# and pulls the optional `tn` dependency, so it stays off (the ONNX CLI does the
# same). It is not needed for German/English playback.
SAMPLE_RATE = 48000


class TTSEngine:
    def __init__(self, server: SidecarServer):
        self.server = server
        self.ref_audio = ""
        self.voice = ""

        self._model = None
        self._sample_rate = SAMPLE_RATE
        self._output_rate = SAMPLE_RATE
        self._output_device = config.output_device()
        self._queue: "queue.Queue[tuple[str, str]]" = queue.Queue()
        self._flushed: set[str] = set()
        self._worker = None
        self._running = False

    # --- lifecycle ---------------------------------------------------------

    def load(self) -> None:
        from onnx_tts_runtime import OnnxTtsRuntime

        provider = "cuda" if config.device() == "cuda" else "cpu"
        self.server.log(f"loading MOSS-TTS-Nano (ONNX, {provider})")
        self._model = OnnxTtsRuntime(
            model_dir=None,
            thread_count=8,
            execution_provider=provider,
        )
        self._sample_rate = SAMPLE_RATE
        self._resolve_output()
        self._running = True
        self._worker = threading.Thread(target=self._play_loop, daemon=True)
        self._worker.start()
        self.server.log("TTS ready")

    def _resolve_output(self) -> None:
        """Pick the first output device that actually opens, mirroring the STT
        mic fallback (PortAudio pulse/pipewire PCMs often fail with -9999)."""
        for device in self._output_candidates():
            try:
                info = sd.query_devices(device, kind="output")
                rate = int(info["default_samplerate"])
                sd.check_output_settings(device=device, samplerate=rate, channels=1)
                self._output_device = device
                self._output_rate = rate
                self.server.log(f"speaker: {info['name']} @ {rate} Hz")
                return
            except Exception:
                continue
        self.server.log("no output device opened; falling back to PortAudio default")

    def _output_candidates(self) -> list:
        candidates: list = []
        if self._output_device is not None:
            candidates.append(self._output_device)
        candidates.append(None)
        for index, info in enumerate(sd.query_devices()):
            if info["max_output_channels"] > 0 and index not in candidates:
                candidates.append(index)
        return candidates

    def handle(self, command: dict) -> None:
        op = command.get("op")
        if op == "config":
            self.ref_audio = command.get("refAudio", self.ref_audio)
            self.voice = command.get("voice", self.voice)
        elif op == "speak":
            self._queue.put((command.get("gen", ""), command.get("text", "")))
        elif op == "flush":
            self._flush(command.get("gen", ""))

    def _flush(self, gen: str) -> None:
        self._flushed.add(gen)
        sd.stop()  # cut whatever is currently playing

    # --- synthesis + playback ---------------------------------------------

    def _play_loop(self) -> None:
        while self._running:
            try:
                gen, text = self._queue.get(timeout=0.1)
            except queue.Empty:
                continue
            if gen in self._flushed or not text.strip():
                continue
            self._synth_and_play(gen, text)

    def _synth_and_play(self, gen: str, text: str) -> None:
        self.server.emit(event="speaking_start", gen=gen)
        try:
            wav = self._synth(text)
        except Exception as error:
            self.server.emit(event="error", message=str(error))
            return
        if gen in self._flushed:
            return
        if self._output_rate != self._sample_rate:
            wav = soxr.resample(wav, self._sample_rate, self._output_rate)
        sd.play(wav, self._output_rate, device=self._output_device)
        sd.wait()
        if self._queue.empty():
            self.server.emit(event="idle", gen=gen)

    def _synth(self, text: str) -> np.ndarray:
        prompt = config.resolve_voice(self.ref_audio)
        result = self._model.synthesize(
            text=text,
            voice=self.voice or None,
            prompt_audio_path=prompt or None,
            output_audio_path=None,
            streaming=True,
            enable_wetext=False,
            enable_normalize_tts_text=False,
        )
        waveform = np.asarray(result["waveform"], dtype=np.float32)
        self._sample_rate = int(result["sample_rate"])
        # MOSS returns (samples, channels); play mono.
        if waveform.ndim == 2:
            waveform = waveform[:, 0]
        return waveform


def main() -> None:
    config.setup_caches()
    server = SidecarServer("tts", tts_socket_path())
    engine = TTSEngine(server)
    threading.Thread(target=engine.load, daemon=True).start()
    server.serve(engine.handle)


if __name__ == "__main__":
    main()
