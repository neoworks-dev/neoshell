import gi, sys
gi.require_version('WPEPlatform','2.0')
gi.require_version('WPEPlatformWayland','2.0')
gi.require_version('WPEPlatformHeadless','2.0')
from gi.repository import WPEPlatform, WPEPlatformWayland, WPEPlatformHeadless

def report(tag, disp):
    try:
        disp.connect_default() if hasattr(disp,'connect_default') else None
    except Exception as e:
        pass
    n = disp.get_n_screens()
    print(f"[{tag}] type={type(disp).__name__} n_screens={n}")
    for i in range(n):
        s = disp.get_screen(i)
        rr = s.get_refresh_rate()  # milliHz
        obs = s.get_sync_observer()
        print(f"[{tag}]   screen{i} refresh={rr} mHz ({rr/1000:.2f} Hz) sync_observer={'YES' if obs else 'None'}")

# Wayland backend (connect to Hyprland)
try:
    wd = WPEPlatformWayland.DisplayWayland.new()
    # try to connect to the running compositor
    for m in ('connect','do_connect'):
        pass
    ok = False
    try:
        wd.connect(None); ok=True   # may conflict with GObject.connect
    except Exception as e:
        print("[wayland] connect(None) err:", e)
    report('wayland', wd)
except Exception as e:
    print("[wayland] FAILED:", e)

# Headless backend
try:
    hd = WPEPlatformHeadless.DisplayHeadless.new()
    report('headless', hd)
except Exception as e:
    print("[headless] FAILED:", e)
