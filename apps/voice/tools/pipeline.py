"""Standalone STT -> LLM -> TTS pipeline tester.

Exercises the three model stages end to end WITHOUT the Go core, sockets, or the
shell: capture mic -> Moonshine -> Ollama (gemma4:e4b) -> Supertonic 3 ->
speaker. Prints per-stage timing so you can see where latency goes.

Run from apps/voice:
    .venv/bin/python -m tools.pipeline
    .venv/bin/python -m tools.pipeline --seconds 6      # fixed-length capture
    .venv/bin/python -m tools.pipeline --text "What time is it?"   # skip mic

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
    """Stream the captured utterance through Moonshine, mirroring the sidecar.
    Streaming archs (small/medium) only produce output this way."""
    import moonshine_voice as moonshine
    from moonshine_voice import LineCompleted, ModelArch

    wanted_arch = ModelArch.MEDIUM_STREAMING
    for info in moonshine.download.MODEL_INFO.get(language, {}).get("models", []):
        if info["model_name"] == model_name:
            wanted_arch = info["model_arch"]
            break
    name, arch = moonshine.get_model_for_language(language, wanted_arch)
    model = moonshine.Transcriber(model_path=moonshine.get_model_path(name), model_arch=arch)

    lines: list[str] = []
    model.add_listener(lambda ev: lines.append(ev.line.text) if isinstance(ev, LineCompleted) else None)
    model.start()
    for start in range(0, len(audio), STT_RATE // 2):
        model.add_audio(audio[start:start + STT_RATE // 2].tolist(), STT_RATE)
    model.stop()
    return " ".join(lines).strip()


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


def speak(text: str, voice: str, language: str) -> None:
    from neoshell_voice import tts

    class Stub:
        def log(self, *a, **k):
            print("[tts]", *a, flush=True)

        def emit(self, *a, **k):
            pass

    engine = tts.TTSEngine(Stub())
    engine.load()
    engine.voice = voice
    engine.language = language
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
    parser.add_argument("--stt-model", default="medium-streaming-en")
    parser.add_argument("--language", default="en")
    parser.add_argument("--llm", default="gemma4:e4b")
    parser.add_argument("--voice", default="M1", help="Supertonic preset: F1-F5 or M1-M5.")
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
    speak(answer, args.voice, args.language)
    print(f"[tts] {time.time() - t:.2f}s  (spoken)", flush=True)


if __name__ == "__main__":
    main()
