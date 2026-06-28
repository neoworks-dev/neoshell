#!/usr/bin/env python3
import json, os, socket, sys, time, threading
sp = f"{os.environ.get('XDG_RUNTIME_DIR','/run/user/%d'%os.getuid())}/neobar-render.sock"
here = os.path.dirname(os.path.abspath(__file__))
s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
for _ in range(100):
    try: s.connect(sp); break
    except OSError: time.sleep(0.05)
def rd():
    buf=b""
    while True:
        d=s.recv(4096)
        if not d: break
        buf+=d
        while b"\n" in buf:
            line,buf=buf.split(b"\n",1)
            if line.strip(): print("[event]", line.decode(), flush=True)
threading.Thread(target=rd,daemon=True).start()
def send(o): s.sendall((json.dumps(o)+"\n").encode())
send({"cmd":"surface.create","role":"bar","url":f"file://{here}/click-test.html",
      "monitor":"eDP-2","layer":"overlay","anchors":["top","left","right","bottom"],
      "keyboard":"ondemand","width":0,"height":0})
time.sleep(0.8)
send({"cmd":"surface.region","role":"bar","rects":[{"x":0,"y":0,"w":1920,"h":1080}]})
time.sleep(int(os.environ.get("DUR","10")))
