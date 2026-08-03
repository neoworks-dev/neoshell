"""Environment-driven paths and device selection for the sidecars.

Per-turn settings (models, VAD, voice) arrive from the Go core over the socket
`config` op; this module only resolves machine-level paths and the compute
device, mirroring the Go core's model-dir convention.
"""

import os
from pathlib import Path


def data_dir() -> Path:
    base = os.environ.get("XDG_DATA_HOME") or os.path.expanduser("~/.local/share")
    return Path(base) / "neoshell"


def models_dir() -> Path:
    override = os.environ.get("NEOSHELL_MODELS_DIR")
    if override:
        return Path(override)
    return data_dir() / "models"


def hf_cache_dir() -> Path:
    return models_dir() / "hf"


def voices_dir() -> Path:
    """Bundled reference clips for TTS voice cloning (apps/voice/voices)."""
    return Path(__file__).resolve().parent.parent / "voices"


def resolve_voice(ref: str) -> str:
    """Resolve a reference-audio setting to a path. Absolute/existing paths pass
    through; a bare filename resolves against voices_dir() so the sidecar's cwd
    doesn't matter. Returns "" if nothing usable is found."""
    if not ref:
        return ""
    if os.path.isabs(ref) and os.path.exists(ref):
        return ref
    candidate = voices_dir() / ref
    if candidate.exists():
        return str(candidate)
    if os.path.exists(ref):
        return os.path.abspath(ref)
    return ""


def device() -> str:
    return os.environ.get("NEOSHELL_VOICE_DEVICE", "cpu")


def input_device():
    """PortAudio input device name/index override, or None for the default."""
    return os.environ.get("NEOSHELL_VOICE_INPUT") or None


def output_device():
    """PortAudio output device name/index override, or None for the default."""
    return os.environ.get("NEOSHELL_VOICE_OUTPUT") or None


def setup_caches() -> None:
    """Point HuggingFace and Moonshine downloads at the shared neoshell models dir."""
    cache = hf_cache_dir()
    cache.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("HF_HOME", str(cache))
    os.environ.setdefault("MOONSHINE_VOICE_CACHE", str(models_dir() / "moonshine"))
    os.environ.setdefault("SUPERTONIC_CACHE_DIR", str(models_dir() / "supertonic"))
