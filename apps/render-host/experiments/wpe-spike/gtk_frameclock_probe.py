# Does GTK4's GdkFrameClock tick at 144 for a normal Wayland client here?
# This isolates compositor/GTK pacing from WebKit content throttling.
import gi
gi.require_version("Gtk", "4.0")
from gi.repository import Gtk, GLib

class P:
    def __init__(self):
        self.win = Gtk.Window(); self.win.set_default_size(700, 400)
        self.area = Gtk.DrawingArea(); self.area.set_draw_func(self.draw)
        self.win.set_child(self.area)
        self.frames = 0; self.samples = []
        self.win.present()
        self.area.add_tick_callback(self.tick)
        self.last = None
        GLib.timeout_add(1000, self.sec)
        self.secs = 0
    def tick(self, widget, clock):
        self.frames += 1
        self.area.queue_draw()   # keep producing damage
        return True
    def draw(self, area, cr, w, h):
        cr.set_source_rgb(0.1,0.1,0.12); cr.paint()
    def sec(self):
        self.samples.append(self.frames); print("[gtk] frameclock fps =", self.frames)
        self.frames = 0; self.secs += 1
        if self.secs >= 8:
            steady = self.samples[1:]
            print("[gtk] avg =", round(sum(steady)/len(steady),1), "peak =", max(steady))
            self.win.close(); return False
        return True

p = P(); loop = GLib.MainLoop()
p.win.connect("close-request", lambda *_: loop.quit()); loop.run()
