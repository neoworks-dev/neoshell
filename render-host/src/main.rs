//! neobar render host.
//!
//! Owns wlr-layer-shell surfaces and paints Ultralight OSR views into them.
//! Driven over a unix-socket control protocol by the Go core. Carries no shell
//! logic — it is a pixel pump. See ../MIGRATION.md for the full design.
//!
//! Stage 2: brings up Wayland + one or more layer surfaces and presents
//! Ultralight's CPU bitmap via wl_shm, frame-callback driven.

mod input;
mod protocol;
mod surface;
mod ultralight;
mod wayland;

use std::io::{BufRead, BufReader};
use std::os::unix::net::UnixListener;
use std::thread;

use calloop::channel::{channel, Event as ChannelEvent, Sender};
use calloop::EventLoop;
use calloop_wayland_source::WaylandSource;
use wayland_client::globals::registry_queue_init;
use wayland_client::Connection;

use protocol::{Command, Keyboard, Layer};
use ultralight::Renderer;
use wayland::State;

fn socket_path() -> String {
    let runtime = std::env::var("XDG_RUNTIME_DIR")
        .unwrap_or_else(|_| format!("/run/user/{}", unsafe { getuid() }));
    format!("{runtime}/neobar-render.sock")
}

extern "C" {
    fn getuid() -> u32;
}

/// Ultralight filesystem base dir. Ultralight loads assets from
/// `<base>/resources/` (default resource prefix), so this is the SDK *root*,
/// not its `resources/` subdir. `ULTRALIGHT_SDK_ROOT` or `./lib` as a fallback.
fn filesystem_base_dir() -> String {
    std::env::var("ULTRALIGHT_SDK_ROOT").unwrap_or_else(|_| "./lib".to_string())
}

fn main() {
    env_logger::init();

    let conn = Connection::connect_to_env().expect("connect to wayland");
    let (globals, event_queue) = registry_queue_init(&conn).expect("registry init");
    let qh = event_queue.handle();

    let renderer = Renderer::new(&filesystem_base_dir()).expect("ultralight renderer");
    let mut state = State::new(&globals, qh.clone(), renderer).expect("wayland state");

    let mut event_loop: EventLoop<State> = EventLoop::try_new().expect("event loop");
    let loop_handle = event_loop.handle();

    WaylandSource::new(conn, event_queue)
        .insert(loop_handle.clone())
        .expect("insert wayland source");

    // Control commands arrive on a background thread and cross into the loop via
    // a calloop channel so they're applied on the same thread as rendering.
    let (sender, channel) = channel::<Command>();
    loop_handle
        .insert_source(channel, |event, _, state: &mut State| {
            if let ChannelEvent::Msg(command) = event {
                state.handle_command(command);
            }
        })
        .expect("insert command channel");

    spawn_control_listener(sender.clone());
    maybe_send_test_surface(&sender);

    log::info!("render host running");
    loop {
        if let Err(err) = event_loop.dispatch(None, &mut state) {
            log::error!("dispatch: {err}");
            break;
        }
    }
}

/// Accept core connections on the control socket and forward parsed commands.
/// Stage 2 is command-only; event emission back to the core is stage 5.
fn spawn_control_listener(sender: Sender<Command>) {
    let path = socket_path();
    let _ = std::fs::remove_file(&path);

    let listener = match UnixListener::bind(&path) {
        Ok(listener) => listener,
        Err(err) => {
            log::error!("bind {path}: {err}");
            return;
        }
    };
    log::info!("control socket: {path}");

    thread::spawn(move || {
        for stream in listener.incoming() {
            let stream = match stream {
                Ok(stream) => stream,
                Err(err) => {
                    log::warn!("accept: {err}");
                    continue;
                }
            };
            let reader = BufReader::new(stream);
            for line in reader.lines() {
                let line = match line {
                    Ok(line) => line,
                    Err(_) => break,
                };
                if line.trim().is_empty() {
                    continue;
                }
                match serde_json::from_str::<Command>(&line) {
                    Ok(command) => {
                        if sender.send(command).is_err() {
                            return; // loop gone
                        }
                    }
                    Err(err) => log::warn!("bad command {line:?}: {err}"),
                }
            }
        }
    });
}

/// `--test-url <URL>` creates a centered overlay panel loading URL, so the host
/// can be run standalone (no Go core) to eyeball rendering and fps. The special
/// value `fps` loads a built-in animated fps page (see FPS_PAGE).
fn maybe_send_test_surface(sender: &Sender<Command>) {
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        if arg != "--test-url" {
            continue;
        }
        let Some(value) = args.next() else {
            log::error!("--test-url needs a URL (or `fps`)");
            return;
        };
        let url = match value.as_str() {
            "fps" => format!("html:{FPS_PAGE}"),
            "probe" => format!("html:{PROBE_PAGE}"),
            _ => value,
        };
        // A centered panel (no anchors) — visible enough to judge animation
        // smoothness without locking the whole screen.
        let command = Command::Create {
            role: "test".to_string(),
            url,
            monitor: String::new(),
            layer: Layer::Overlay,
            anchors: vec![],
            width: 1000,
            height: 560,
            keyboard: Keyboard::OnDemand,
            exclusive_edge: None,
            exclusive_size: 0,
        };
        let _ = sender.send(command);
        return;
    }
}

/// Built-in fps test page: an on-screen RAF counter plus a smoothly animated
/// box, so on-screen fps and animation smoothness can be eyeballed alongside the
/// host's objective present-rate logging.
const FPS_PAGE: &str = r#"<!doctype html><html><body style="margin:0;height:100vh;background:#0b0f17;color:#5ef38c;font:bold 40px ui-monospace,monospace;overflow:hidden">
<div id="fps" style="position:fixed;top:16px;left:20px">-- fps</div>
<div id="box" style="position:absolute;top:240px;width:120px;height:120px;border-radius:24px;background:linear-gradient(135deg,#5ef38c,#3aa0ff)"></div>
<script>
let last=performance.now(),frames=0;
const fpsEl=document.getElementById('fps'),box=document.getElementById('box');
function loop(t){
  frames++;
  if(t-last>=500){fpsEl.textContent=Math.round(frames*1000/(t-last))+' fps';frames=0;last=t;}
  box.style.left=(Math.sin(t/600)*0.5+0.5)*820+'px';
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
</script></body></html>"#;

/// CSS-compat probe. Reports which modern CSS features Ultralight supports via
/// CSS.supports() and getComputedStyle, logged through the console callback.
/// Run with `--test-url probe` and grep the log for `PROBE`.
const PROBE_PAGE: &str = r#"<!doctype html><html><head><style>
@layer base { #layered { background-color: rgb(1, 2, 3); } }
</style></head><body>
<div id="layered"></div>
<script>
function supports(prop, val){ return (window.CSS && CSS.supports) ? CSS.supports(prop, val) : 'no-CSS.supports'; }
function selSupports(sel){ try { return CSS.supports('selector(' + sel + ')'); } catch(e){ return 'err'; } }
window.addEventListener('load', function(){
  var layered = getComputedStyle(document.getElementById('layered')).backgroundColor;
  console.log('PROBE oklch=' + supports('color', 'oklch(0.7 0.15 200)'));
  console.log('PROBE oklab=' + supports('color', 'oklab(0.7 0.1 0.1)'));
  console.log('PROBE color-mix=' + supports('color', 'color-mix(in srgb, red, blue)'));
  console.log('PROBE has-selector=' + selSupports(':has(*)'));
  console.log('PROBE container-query=' + supports('container-type', 'inline-size'));
  console.log('PROBE at-property=' + (typeof CSS !== 'undefined' && typeof CSS.registerProperty === 'function'));
  console.log('PROBE backdrop-filter=' + supports('backdrop-filter', 'blur(4px)'));
  console.log('PROBE filter-blur=' + supports('filter', 'blur(4px)'));
  console.log('PROBE appearance=' + supports('appearance', 'none'));
  console.log('PROBE webkit-appearance=' + supports('-webkit-appearance', 'none'));
  console.log('PROBE accent-color=' + supports('accent-color', 'red'));
  console.log('PROBE transition=' + supports('transition', 'all 0.2s'));
  console.log('PROBE mask=' + supports('mask-image', 'linear-gradient(#000, #fff)'));
  console.log('PROBE layer-applied=' + layered + ' (expect rgb(1, 2, 3) if @layer works, else rgba(0, 0, 0, 0))');
  console.log('PROBE ua=' + navigator.userAgent);
});
</script></body></html>"#;
