# Off-screen (headless) WPE + a custom screen whose sync observer WE tick at 144Hz.
# If rAF hits 144 with NO visible window, the shell's architecture is unblocked:
# render off-screen, drive vblank from our own layer-surface frame callbacks.
import os, gi
gi.require_version('WPEPlatform','2.0')
gi.require_version('WPEPlatformHeadless','2.0')
gi.require_version('WPEWebKit','2.0')
from gi.repository import WPEPlatform, WPEPlatformHeadless, WPEWebKit, GLib

FEATURE='PreferPageRenderingUpdatesNear60FPS'
HERE=os.path.dirname(os.path.abspath(__file__)); HTML=os.path.join(HERE,'raf-counter.html')

class Observer(WPEPlatform.ScreenSyncObserver):
    def do_start(self):
        self.src = GLib.timeout_add(7, self._tick)   # ~144Hz
    def do_stop(self):
        if getattr(self,'src',None): GLib.source_remove(self.src); self.src=None
    def _tick(self):
        WPEPlatform.ScreenSyncObserver.do_sync(self)  # fire registered callbacks
        return True

class Screen(WPEPlatform.Screen):
    def do_get_sync_observer(self):
        if not hasattr(self,'_obs'): self._obs = Observer()
        return self._obs

class Display(WPEPlatformHeadless.DisplayHeadless):
    def do_get_n_screens(self): return 1
    def do_get_screen(self, i):
        if not hasattr(self,'_screen'):
            self._screen = Screen(id=1)
            self._screen.set_size(1920,1080); self._screen.set_refresh_rate(144000)
        return self._screen

def set_pref(s,on):
    fs=s.get_all_features()
    for i in range(fs.get_length()):
        f=fs.get(i)
        if f.get_identifier()==FEATURE: s.set_feature_enabled(f,on); return True
    return False

disp = Display()
try: disp.connect(None)
except Exception as e: print('connect:',e)
print('[step2] headless display n_screens =', disp.get_n_screens())
s0 = disp.get_screen(0)
print('[step2] custom screen refresh =', s0.get_refresh_rate()/1000,'Hz sync_observer =', 'YES' if s0.get_sync_observer() else 'None')

view = WPEWebKit.WebView(display=disp)
set_pref(view.get_settings(), False)   # flag OFF -> want full 144
wv = view.get_wpe_view()
tl = WPEPlatformHeadless.ToplevelHeadless(display=disp)
wv.set_toplevel(tl); wv.set_visible(True); wv.map()
view.load_uri('file://'+HTML)

samples=[]; el=[0]
def poll():
    el[0]+=1
    view.evaluate_javascript('window.__fps||0',-1,None,None,None,
        lambda v,r,d: samples.append(_read(v,r)), None)
    if el[0]>=10:
        steady=[x for x in samples[2:] if x and x>0]
        if steady:
            avg=sum(steady)/len(steady)
            print(f'\n[step2] OFF-SCREEN headless RESULT avg={avg:.1f} peak={max(steady)} samples={steady}')
            print('[step2]', 'PASS — 144 off-screen via custom vblank' if avg>=120 else f'got {avg:.0f}')
        else: print('[step2] no samples')
        loop.quit(); return False
    return True
def _read(v,r):
    try: return int(v.evaluate_javascript_finish(r).to_int32())
    except Exception as e: print('js',e); return 0
GLib.timeout_add(1000, poll)
loop=GLib.MainLoop(); loop.run()
