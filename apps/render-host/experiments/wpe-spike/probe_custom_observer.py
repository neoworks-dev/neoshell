# Can a custom WPEScreenSyncObserver subclass fire its registered callbacks?
# This decides whether we can drive WPE's vblank from our own timer.
import gi
gi.require_version('WPEPlatform','2.0')
from gi.repository import WPEPlatform, GLib, GObject

fired = {'n': 0}

class MyObserver(WPEPlatform.ScreenSyncObserver):
    def do_start(self):
        print("[obs] do_start -> launching 144Hz timer")
        # 6.94ms ~ 144Hz
        GLib.timeout_add(7, self.tick)
    def do_stop(self):
        print("[obs] do_stop")
    def tick(self):
        # Try to fire callbacks. Mechanism unknown — probe options.
        try:
            self.do_sync()      # invoke our/base sync vfunc
        except Exception as e:
            print("[obs] do_sync err:", e)
            return False
        return True
    def do_sync(self):
        # Base impl is expected to invoke registered callbacks.
        # If we override without chaining, callbacks may NOT fire -> test tells us.
        WPEPlatform.ScreenSyncObserver.do_sync(self)

def cb(observer, user_data):
    fired['n'] += 1

obs = MyObserver()
cid = obs.add_callback(cb, None)
print("add_callback id =", cid)
# emulate WebKit starting the observer
klass = type(obs)
if hasattr(obs, 'do_start'):
    obs.do_start()

def report():
    print("callbacks fired in ~1s =", fired['n'])
    loop.quit(); return False
GLib.timeout_add(1000, report)
loop = GLib.MainLoop(); loop.run()
