#!/usr/bin/env python3
"""Step 0 kill-switch: does flipping PreferPageRenderingUpdatesNear60FPS unlock
>60fps requestAnimationFrame on this WebKitGTK 6.0 / Hyprland box?

Uses the already-installed webkitgtk-6.0 (no WPE needed). Opens one WebView on
the 144Hz panel showing a rAF fps counter and polls the rate back via JS.

Env:
  FLAG60=on    keep the 60fps-harmonic preference enabled (expect ~72 on 144Hz)
  FLAG60=off   disable it (default; expect ~144 on 144Hz if vblank reports 144)
  RUN_SECS=12  how long to sample
"""
import os
import sys
import gi

gi.require_version("Gtk", "4.0")
gi.require_version("WebKit", "6.0")
from gi.repository import Gtk, WebKit, GLib  # noqa: E402

FEATURE_ID = "PreferPageRenderingUpdatesNear60FPS"
HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, "raf-counter.html")


def set_60fps_pref(settings, enabled):
    features = settings.get_all_features()
    for i in range(features.get_length()):
        feature = features.get(i)
        if feature.get_identifier() == FEATURE_ID:
            settings.set_feature_enabled(feature, enabled)
            return True
    return False


class App:
    def __init__(self):
        self.flag_on = os.environ.get("FLAG60", "off").lower() == "on"
        self.run_secs = int(os.environ.get("RUN_SECS", "12"))
        self.samples = []

        self.win = Gtk.Window()
        self.win.set_default_size(900, 600)

        self.view = WebKit.WebView()
        settings = self.view.get_settings()

        found = set_60fps_pref(settings, self.flag_on)
        state = "ENABLED (expect ~72)" if self.flag_on else "DISABLED (expect ~144)"
        print(f"[step0] {FEATURE_ID} found={found} -> {state}")
        if not found:
            print("[step0] FEATURE NOT FOUND — aborting", file=sys.stderr)
            sys.exit(2)

        self.win.set_child(self.view)
        self.view.load_uri("file://" + HTML)
        self.win.present()

        self.elapsed = 0
        GLib.timeout_add(1000, self.poll)

    def poll(self):
        self.elapsed += 1
        self.view.evaluate_javascript(
            "window.__fps || 0", -1, None, None, None, self.on_js, None
        )
        if self.elapsed >= self.run_secs:
            GLib.timeout_add(200, self.finish)
            return False
        return True

    def on_js(self, view, result, _data):
        try:
            value = view.evaluate_javascript_finish(result)
            fps = int(value.to_int32())
        except Exception as exc:
            print("[step0] js error:", exc)
            return
        self.samples.append(fps)
        print(f"[step0] rAF fps = {fps}")

    def finish(self):
        steady = [s for s in self.samples[2:] if s > 0]
        if steady:
            avg = sum(steady) / len(steady)
            peak = max(steady)
            tag = "on" if self.flag_on else "off"
            print(f"\n[step0] RESULT flag60={tag} steady-avg={avg:.1f} "
                  f"peak={peak} samples={steady}")
            if not self.flag_on:
                print(f"[step0] {'PASS (>=120)' if avg >= 120 else 'BELOW TARGET'}")
        else:
            print("[step0] no samples collected")
        self.win.close()
        return False


def main():
    app = App()
    loop = GLib.MainLoop()
    app.win.connect("close-request", lambda *_: loop.quit())
    loop.run()


if __name__ == "__main__":
    main()
