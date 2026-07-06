"""Persistent NDJSON unix-socket server shared by both sidecars.

The Go core dials the socket; the sidecar serves. One JSON object per line in
each direction. Audio never crosses the socket — each sidecar owns its own
PortAudio device.
"""

import json
import os
import socket
import sys
import threading
from typing import Callable


def runtime_dir() -> str:
    return os.environ.get("XDG_RUNTIME_DIR") or f"/run/user/{os.getuid()}"


def stt_socket_path() -> str:
    return f"{runtime_dir()}/neoshell-voice-stt.sock"


def tts_socket_path() -> str:
    return f"{runtime_dir()}/neoshell-voice-tts.sock"


class SidecarServer:
    """Binds a unix socket and relays NDJSON commands to a handler."""

    def __init__(self, name: str, socket_path: str):
        self.name = name
        self.socket_path = socket_path
        self._conn = None
        self._write_lock = threading.Lock()

    def log(self, message: str) -> None:
        print(f"[voice-{self.name}] {message}", file=sys.stderr, flush=True)

    def emit(self, **event) -> None:
        """Send one event line to the connected core, if any."""
        conn = self._conn
        if conn is None:
            return
        data = (json.dumps(event) + "\n").encode()
        with self._write_lock:
            try:
                conn.sendall(data)
            except OSError:
                pass

    def serve(self, on_command: Callable[[dict], None]) -> None:
        """Accept connections and dispatch each command line to on_command."""
        if os.path.exists(self.socket_path):
            os.remove(self.socket_path)
        server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        server.bind(self.socket_path)
        server.listen(1)
        self.log(f"listening on {self.socket_path}")
        while True:
            conn, _ = server.accept()
            self._conn = conn
            self._serve_conn(conn, on_command)

    def _serve_conn(self, conn: socket.socket, on_command: Callable[[dict], None]) -> None:
        with conn.makefile("rb") as stream:
            for raw in stream:
                line = raw.strip()
                if not line:
                    continue
                try:
                    command = json.loads(line)
                except json.JSONDecodeError:
                    continue
                try:
                    on_command(command)
                except Exception as error:  # keep the sidecar alive on handler faults
                    self.emit(event="error", message=str(error))
        self._conn = None
