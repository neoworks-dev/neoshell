"""Standalone STT -> LLM -> TTS pipeline tester.

Exercises the three model stages end to end WITHOUT the Go core, sockets, or the
shell: capture mic -> faster-whisper -> Ollama (gemma4:e4b) -> MOSS-TTS-Nano ->
speaker. Prints per-stage timing so you can see where latency goes.

Run from apps/voice:
    .venv/bin/python -m tools.pipeline
    .venv/bin/python -m tools.pipeline --seconds 6      # fixed-length capture
    .venv/bin/python -m tools.pipeline --text "Wie spät ist es?"   # skip mic

Env: NEOSHELL_VOICE_DEVICE=cuda|cpu, OLLAMA_HOST (default 127.0.0.1:11434).
"""

import argparse
import json
import logging
import os
import sys
import time
import urllib.request

import numpy as np
import soxr
import sounddevice as sd

from neoshell_voice import config

logging.disable(logging.CRITICAL)

STT_RATE = 16000
FRAME = 512


def capture_utterance(seconds: float, vad_threshold: float, silence_ms: int) -> np.ndarray:
    """Record from the default source. If seconds>0 record fixed length; else use
    Silero VAD to stop ~silence_ms after speech ends (max 15s)."""
    device, rate = open_input()
    print(f"[mic] {device} @ {rate} Hz — speak now…", flush=True)
    if seconds > 0:
        frames = sd.rec(int(rate * seconds), samplerate=rate, channels=1, dtype="float32", device=device)
        sd.wait()
        return resample_16k(frames[:, 0], rate)

    from silero_vad import load_silero_vad
    import torch

    vad = load_silero_vad()
    collected, leftover = [], np.empty(0, dtype=np.float32)
    speech, in_speech, silent = [], False, 0
    frame_ms = FRAME / STT_RATE * 1000
    silence_limit = max(1, int(silence_ms / frame_ms))
    start = time.time()

    with sd.InputStream(samplerate=rate, channels=1, dtype="float32", device=device) as stream:
        while time.time() - start < 15:
            block, _ = stream.read(int(rate * 0.1))
            mono = resample_16k(block[:, 0], rate)
            leftover = np.concatenate([leftover, mono])
            while len(leftover) >= FRAME:
                frame = leftover[:FRAME]
                leftover = leftover[FRAME:]
                prob = float(vad(torch.from_numpy(frame), STT_RATE))
                if prob >= vad_threshold:
                    in_speech = True
                    silent = 0
                    speech.append(frame)
                elif in_speech:
                    speech.append(frame)
                    silent += 1
                    if silent >= silence_limit:
                        return np.concatenate(speech)
    return np.concatenate(speech) if speech else np.zeros(0, dtype=np.float32)


def resample_16k(mono: np.ndarray, rate: int) -> np.ndarray:
    if rate == STT_RATE:
        return mono.astype(np.float32)
    return soxr.resample(mono, rate, STT_RATE).astype(np.float32)


def open_input():
    """Return (device, native_rate) using the sound-server routes first."""
    candidates = ["pipewire", "pulse", "default", None]
    for index, info in enumerate(sd.query_devices()):
        if info["max_input_channels"] > 0:
            candidates.append(index)
    for device in candidates:
        try:
            info = sd.query_devices(device, kind="input")
            rate = int(info["default_samplerate"])
            with sd.InputStream(samplerate=rate, channels=1, dtype="float32", device=device):
                pass
            return device, rate
        except Exception:
            continue
    raise RuntimeError("no usable input device")


def transcribe(audio: np.ndarray, model_name: str, language: str) -> str:
    from faster_whisper import WhisperModel

    dev = config.device()
    compute = "float16" if dev == "cuda" else "int8"
    model = WhisperModel(model_name, device=dev, compute_type=compute,
                         download_root=str(config.models_dir() / "whisper"))
    segments, _ = model.transcribe(audio, language=language, beam_size=1)
    return " ".join(segment.text for segment in segments).strip()


def ask_llm(prompt: str, model: str) -> str:
    host = os.environ.get("OLLAMA_HOST", "127.0.0.1:11434")
    if not host.startswith("http"):
        host = "http://" + host
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
    }).encode()
    request = urllib.request.Request(f"{host}/api/chat", data=body,
                                     headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=120) as response:
        payload = json.loads(response.read())
    return payload["message"]["content"].strip()


def speak(text: str, ref_audio: str) -> None:
    from neoshell_voice import tts

    class Stub:
        def log(self, *a, **k):
            print("[tts]", *a, flush=True)

        def emit(self, *a, **k):
            pass

    engine = tts.TTSEngine(Stub())
    engine.load()
    engine.ref_audio = ref_audio
    wav = engine._synth(text)
    rate = engine._sample_rate
    if engine._output_rate != rate:
        wav = soxr.resample(wav, rate, engine._output_rate)
        rate = engine._output_rate
    sd.play(wav, rate, device=engine._output_device)
    sd.wait()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", default="", help="Skip the mic; use this transcript directly.")
    parser.add_argument("--seconds", type=float, default=0.0, help="Fixed capture length; 0 = VAD auto-stop.")
    parser.add_argument("--stt-model", default="distil-large-v3")
    parser.add_argument("--language", default="de")
    parser.add_argument("--llm", default="gemma4:e4b")
    parser.add_argument("--ref-audio", default="tim-knauer.wav")
    parser.add_argument("--vad-threshold", type=float, default=0.5)
    parser.add_argument("--silence-ms", type=int, default=700)
    args = parser.parse_args()

    config.setup_caches()

    text = args.text
    if not text:
        audio = capture_utterance(args.seconds, args.vad_threshold, args.silence_ms)
        if audio.size == 0:
            print("no speech captured", file=sys.stderr)
            return
        t = time.time()
        text = transcribe(audio, args.stt_model, args.language)
        print(f"[stt] {time.time() - t:.2f}s  ->  {text!r}", flush=True)
    if not text:
        print("empty transcript", file=sys.stderr)
        return

    t = time.time()
    answer = ask_llm(text, args.llm)
    print(f"[llm] {time.time() - t:.2f}s  ->  {answer!r}", flush=True)

    t = time.time()
    speak(answer, args.ref_audio)
    print(f"[tts] {time.time() - t:.2f}s  (spoken)", flush=True)


if __name__ == "__main__":
    main()
