#!/usr/bin/env python3
"""Mimic the Go controller: connect to the render-host socket, create surfaces,
read events. Validates multi-surface (N independent WPE views)."""
import json, os, socket, sys, time, threading

sock_path = f"{os.environ.get('XDG_RUNTIME_DIR', '/run/user/%d' % os.getuid())}/neobar-render.sock"
here = os.path.dirname(os.path.abspath(__file__))
mon = os.environ.get("MON", "eDP-2")

def wait_connect():
    for _ in range(100):
        try:
            s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM); s.connect(sock_path); return s
        except OSError:
            time.sleep(0.05)
    print("could not connect"); sys.exit(1)

s = wait_connect()

def reader():
    buf = b""
    while True:
        d = s.recv(4096)
        if not d: break
        buf += d
        while b"\n" in buf:
            line, buf = buf.split(b"\n", 1)
            if line.strip(): print("[event]", line.decode())
threading.Thread(target=reader, daemon=True).start()

def send(obj): s.sendall((json.dumps(obj) + "\n").encode())

# Surface 1: animating bar (rAF 144) anchored top, fullscreen overlay
send({"cmd": "surface.create", "role": "bar",
      "url": f"file://{here}/raf-counter.html", "monitor": mon,
      "layer": "top", "anchors": ["top", "left", "right"], "keyboard": "none",
      "width": 0, "height": 0})
time.sleep(1.0)
# Surface 2: static widget, small box top-left on the background layer
send({"cmd": "surface.create", "role": "widget",
      "url": f"file://{here}/static.html", "monitor": mon,
      "layer": "background", "anchors": ["top", "left"], "keyboard": "none",
      "width": 500, "height": 300})
time.sleep(1.0)
# Mark an interactive region on the bar (rest click-through)
send({"cmd": "surface.region", "role": "bar",
      "rects": [{"x": 100, "y": 10, "w": 300, "h": 40}]})
# Reserve a top strip
send({"cmd": "surface.exclusive", "role": "bar", "edge": "top", "size": 40})

dur = int(os.environ.get("DUR", "8"))
print(f"running {dur}s with 2 surfaces...")
time.sleep(dur)
send({"cmd": "surface.destroy", "role": "widget"})
print("destroyed widget; 2s more")
time.sleep(2)
