"""Supertonic 3 sidecar.

Loads Supertonic 3 (ONNX) once and synthesizes queued sentences (fed by the Go
orchestrator one sentence at a time), playing them through the default output
device. On CPU it is ~0.4-1.5s per sentence (RTF ~0.16-0.30), so it needs no GPU
at all. A flush drops the queue and stops playback for barge-in / interrupts.

Voices are the built-in presets F1-F5 (female) and M1-M5 (male); Supertonic has
no voice cloning, so there is no reference-audio path. Language is explicit
(voice.language) because the model takes a language code rather than detecting
one; anything outside LANGUAGES falls back to English.
"""

import queue
import threading

import numpy as np
import soxr
import sounddevice as sd

from . import config
from .common import SidecarServer, tts_socket_path

# Supertonic 3 renders at 44.1 kHz. Used only until the model reports its own
# rate in load(); playback resamples to whatever the output device wants.
SAMPLE_RATE = 44100

DEFAULT_VOICE = "M1"

# The 31 languages Supertonic 3 ships. Text in anything else is still spoken,
# but with English phonemization, so an unknown code maps to "en" explicitly.
LANGUAGES = {
    "en", "ko", "ja", "ar", "bg", "cs", "da", "de", "el", "es", "et", "fi",
    "fr", "hi", "hr", "hu", "id", "it", "lt", "lv", "nl", "pl", "pt", "ro",
    "ru", "sk", "sl", "sv", "tr", "uk", "vi",
}


class TTSEngine:
    def __init__(self, server: SidecarServer):
        self.server = server
        self.voice = DEFAULT_VOICE
        self.language = "en"

        self._model = None
        self._sample_rate = SAMPLE_RATE
        self._output_rate = SAMPLE_RATE
        self._output_device = config.output_device()
        self._queue: "queue.Queue[tuple[str, str]]" = queue.Queue()
        self._flushed: set[str] = set()
        self._styles: dict = {}
        self._worker = None
        self._running = False

    # --- lifecycle ---------------------------------------------------------

    def load(self) -> None:
        # Provider selection is a module global read when a session is built, so
        # it has to be set before `supertonic.TTS` is imported and constructed.
        import supertonic.loader as loader

        if config.device() == "cuda":
            loader.DEFAULT_ONNX_PROVIDERS = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        else:
            loader.DEFAULT_ONNX_PROVIDERS = ["CPUExecutionProvider"]

        from supertonic import TTS

        self.server.log(f"loading Supertonic 3 (ONNX, {config.device()})")
        self._model = TTS(auto_download=True, intra_op_num_threads=8)
        self._sample_rate = int(self._model.sample_rate)
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
            self.voice = command.get("voice", self.voice)
            self.language = command.get("language", self.language)
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

    def _voice_style(self):
        """Look up (and cache) the preset style. Styles are per-voice tensors the
        model loads from disk, so resolving one per utterance would be wasteful."""
        name = self.voice or DEFAULT_VOICE
        if name in self._styles:
            return self._styles[name]
        try:
            style = self._model.get_voice_style(voice_name=name)
        except FileNotFoundError as error:
            self.server.log(f"unknown voice {name!r}, using {DEFAULT_VOICE}: {error}")
            style = self._model.get_voice_style(voice_name=DEFAULT_VOICE)
        self._styles[name] = style
        return style

    def _language(self) -> str:
        if self.language in LANGUAGES:
            return self.language
        return "en"

    def _synth(self, text: str) -> np.ndarray:
        waveform, _duration = self._model.synthesize(
            text=text,
            voice_style=self._voice_style(),
            lang=self._language(),
        )
        audio = np.asarray(waveform, dtype=np.float32)
        # Supertonic returns a batch dimension; play the single mono item.
        if audio.ndim == 2:
            audio = audio[0]
        return audio


def main() -> None:
    config.setup_caches()
    server = SidecarServer("tts", tts_socket_path())
    engine = TTSEngine(server)
    threading.Thread(target=engine.load, daemon=True).start()
    server.serve(engine.handle)


if __name__ == "__main__":
    main()
