//! neobar CEF render host.
//!
//! Subprocesses (render/gpu/utility) re-exec this same binary; main() first
//! registers the CEF API version, then hands off to execute_process and exits if
//! this is a child. The browser process brings up CEF and the Wayland event loop.

mod cef_engine;
mod input;
mod protocol;
mod surface;
mod wayland;

use std::io::{BufRead, BufReader};
use std::os::unix::net::UnixListener;
use std::thread;
use std::time::Duration;

use calloop::channel::{channel, Event as ChannelEvent, Sender};
use calloop::timer::{TimeoutAction, Timer};
use calloop::EventLoop;
use calloop_wayland_source::WaylandSource;
use cef::args::Args;
use wayland_client::globals::registry_queue_init;
use wayland_client::Connection;

use protocol::{Command, Keyboard, Layer};
use wayland::State;

/// CEF message-loop pump interval (~250Hz) so paints at up to 144fps are
/// delivered promptly.
const PUMP_INTERVAL: Duration = Duration::from_millis(4);

fn socket_path() -> String {
    let runtime = std::env::var("XDG_RUNTIME_DIR")
        .unwrap_or_else(|_| format!("/run/user/{}", unsafe { getuid() }));
    format!("{runtime}/neobar-render.sock")
}

extern "C" {
    fn getuid() -> u32;
}

fn main() {
    env_logger::init();

    // Register the API version before any CEF object is created.
    let _ = cef::api_hash(cef::sys::CEF_API_VERSION_LAST, 0);

    // Subprocess handoff: >= 0 in a child (which exits), -1 in the browser process.
    // The app handler carries our command-line switches into every subprocess.
    let args = Args::new();
    let mut app = cef_engine::new_app();
    let exit_code = cef::execute_process(
        Some(args.as_main_args()),
        Some(&mut app),
        std::ptr::null_mut(),
    );
    if exit_code >= 0 {
        std::process::exit(exit_code);
    }

    let engine = cef_engine::Engine::init();

    let conn = Connection::connect_to_env().expect("connect to wayland");
    let (globals, event_queue) = registry_queue_init(&conn).expect("registry init");
    let qh = event_queue.handle();
    let mut state = State::new(&globals, qh.clone()).expect("wayland state");

    let mut event_loop: EventLoop<State> = EventLoop::try_new().expect("event loop");
    let loop_handle = event_loop.handle();

    WaylandSource::new(conn, event_queue)
        .insert(loop_handle.clone())
        .expect("insert wayland source");

    // Pump CEF on a timer so it renders and delivers on_paint independent of
    // Wayland frame callbacks (which only drive presentation).
    loop_handle
        .insert_source(Timer::from_duration(PUMP_INTERVAL), |_deadline, _meta, _state| {
            cef_engine::pump();
            TimeoutAction::ToDuration(PUMP_INTERVAL)
        })
        .expect("insert cef pump timer");

    // Control commands from the Go core arrive on a background thread and cross
    // into the loop via a calloop channel.
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

    engine.shutdown();
}

/// Accept core connections on the control socket and forward parsed commands.
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
                            return;
                        }
                    }
                    Err(err) => log::warn!("bad command {line:?}: {err}"),
                }
            }
        }
    });
}

/// `--test-url <URL>` creates a centered overlay panel loading URL, so the host
/// can be run standalone (no Go core). The special value `fps` loads a built-in
/// animated fps page.
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
            "fps" => FPS_DATA_URL.to_string(),
            _ => value,
        };
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

/// Built-in fps test page (as a data URL): an on-screen RAF counter plus a moving
/// box, to eyeball animation smoothness alongside the host's present-rate log.
const FPS_DATA_URL: &str = "data:text/html,\
<body style='margin:0;height:100vh;background:%230b0f17;color:%235ef38c;font:bold 40px monospace;overflow:hidden'>\
<div id=fps style='position:fixed;top:16px;left:20px'>-- fps</div>\
<div id=box style='position:absolute;top:240px;width:120px;height:120px;border-radius:24px;background:%235ef38c'></div>\
<script>let last=performance.now(),frames=0;const f=document.getElementById('fps'),b=document.getElementById('box');\
function loop(t){frames++;if(t-last>=500){f.textContent=Math.round(frames*1000/(t-last))+' fps';frames=0;last=t;}\
b.style.left=(Math.sin(t/600)*0.5+0.5)*820+'px';requestAnimationFrame(loop);}requestAnimationFrame(loop);</script></body>";
