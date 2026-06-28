#!/usr/bin/env python3
"""Step 1 (definitive): WPEPlatform Wayland WebView, mapped, flag off -> rAF rate?

Only screen0 reported a sync_observer, so we report which screen the view lands
on. If rAF stays ~60 even on the sync-observer screen, WPE does not unlock >60
rendering updates on this machine.

Env: FLAG60=on|off (default off), RUN_SECS=12
"""
import os
import gi

gi.require_version("WPEPlatform", "2.0")
gi.require_version("WPEPlatformWayland", "2.0")
gi.require_version("WPEWebKit", "2.0")
from gi.repository import WPEPlatformWayland, WPEWebKit, GLib  # noqa: E402

FEATURE_ID = "PreferPageRenderingUpdatesNear60FPS"
HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, "raf-counter.html")


def set_pref(settings, enabled):
    features = settings.get_all_features()
    for i in range(features.get_length()):
        f = features.get(i)
        if f.get_identifier() == FEATURE_ID:
            settings.set_feature_enabled(f, enabled)
            return True
    return False


def screen_info(view):
    try:
        screen = view.get_screen()
        if screen is None:
            return "screen=None"
        obs = screen.get_sync_observer()
        return (f"screen refresh={screen.get_refresh_rate()/1000:.2f}Hz "
                f"sync_observer={'YES' if obs else 'None'}")
    except Exception as exc:
        return f"screen? {exc}"


class Probe:
    def __init__(self):
        self.flag_on = os.environ.get("FLAG60", "off").lower() == "on"
        self.run_secs = int(os.environ.get("RUN_SECS", "12"))
        self.samples = []

        self.display = WPEPlatformWayland.DisplayWayland.new()
        self.display.connect(None)

        self.view = WPEWebKit.WebView(display=self.display)
        found = set_pref(self.view.get_settings(), self.flag_on)
        print(f"[step1] flag {FEATURE_ID}={'on' if self.flag_on else 'OFF'} found={found}")

        self.wpe_view = self.view.get_wpe_view()
        toplevel = WPEPlatformWayland.ToplevelWayland(display=self.display)
        toplevel.set_title("wpe-spike")
        self.wpe_view.set_toplevel(toplevel)
        self.wpe_view.set_visible(True)
        if self.wpe_view.do_can_be_mapped(self.wpe_view) if False else True:
            self.wpe_view.map()
        self.toplevel = toplevel

        self.view.load_uri("file://" + HTML)
        self.reported_screen = False
        self.elapsed = 0
        GLib.timeout_add(1000, self.poll)

    def poll(self):
        self.elapsed += 1
        if self.elapsed == 2:
            # Force the window onto eDP-2 (the screen that exposed a sync_observer).
            import subprocess
            subprocess.run(["hyprctl", "dispatch", "focuswindow", "title:wpe-spike"],
                           capture_output=True)
            mon = os.environ.get("MON", "eDP-2")
            subprocess.run(["hyprctl", "dispatch", "movewindow", f"mon:{mon}"],
                           capture_output=True)
            print(f"[step1] moved window -> {mon}")
        print(f"[step1] view on {screen_info(self.wpe_view)}")
        self.view.evaluate_javascript("window.__fps||0", -1, None, None, None, self.on_js, None)
        if self.elapsed >= self.run_secs:
            GLib.timeout_add(200, self.finish)
            return False
        return True

    def on_js(self, view, result, _data):
        try:
            fps = int(view.evaluate_javascript_finish(result).to_int32())
        except Exception as exc:
            print("[step1] js error:", exc)
            return
        self.samples.append(fps)
        print(f"[step1] rAF fps = {fps}")

    def finish(self):
        steady = [s for s in self.samples[2:] if s > 0]
        if steady:
            avg = sum(steady) / len(steady)
            print(f"\n[step1] RESULT flag60={'on' if self.flag_on else 'off'} "
                  f"avg={avg:.1f} peak={max(steady)} samples={steady}")
            if not self.flag_on:
                print(f"[step1] {'PASS (>=120)' if avg >= 120 else 'BELOW TARGET — WPE capped at 60 here'}")
        else:
            print("[step1] no samples (view not active?)")
        self.loop.quit()
        return False


def main():
    p = Probe()
    p.loop = GLib.MainLoop()
    p.loop.run()


if __name__ == "__main__":
    main()
