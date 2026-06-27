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

use protocol::{Command, Edge, Keyboard, Layer};
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

/// `--test-url <URL>` creates a fullscreen overlay surface loading URL, so the
/// host can be run standalone (no Go core) to eyeball rendering and fps.
fn maybe_send_test_surface(sender: &Sender<Command>) {
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        if arg != "--test-url" {
            continue;
        }
        let Some(url) = args.next() else {
            log::error!("--test-url needs a URL");
            return;
        };
        // A 48px top bar (not fullscreen) so the test is non-disruptive while
        // still exercising the full present pipeline.
        let command = Command::Create {
            role: "test".to_string(),
            url,
            monitor: String::new(),
            layer: Layer::Top,
            anchors: vec![Edge::Top, Edge::Left, Edge::Right],
            keyboard: Keyboard::None,
            exclusive_edge: Some(Edge::Top),
            exclusive_size: 48,
        };
        let _ = sender.send(command);
        return;
    }
}
