//! neobar render host.
//!
//! Owns wlr-layer-shell surfaces and paints Ultralight OSR views into them via
//! dmabuf. Driven over a unix-socket control protocol by the Go core. Carries no
//! shell logic — it is a pixel pump. See MIGRATION.md for the full design.

mod input;
mod protocol;
mod surface;
mod ultralight;
mod wayland;

use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::{UnixListener, UnixStream};

use protocol::{Command, Event};

fn socket_path() -> String {
    let runtime = std::env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| {
        format!("/run/user/{}", unsafe { libc_getuid() })
    });
    format!("{runtime}/neobar-render.sock")
}

// Avoid a libc dependency just for getuid in this skeleton.
extern "C" {
    #[link_name = "getuid"]
    fn libc_getuid() -> u32;
}

fn main() {
    env_logger::init();

    let path = socket_path();
    let _ = std::fs::remove_file(&path);
    let listener = UnixListener::bind(&path).expect("bind control socket");
    log::info!("render host listening on {path}");

    // STAGE 1: accept a single core connection and run the control loop.
    // STAGE 2+: the Wayland event loop and the control loop must be driven
    // together (calloop), so the layer-shell surfaces pump frames while commands
    // arrive. For now the control loop is standalone to prove protocol parsing.
    let (stream, _) = listener.accept().expect("accept core connection");
    if let Err(err) = run_control_loop(stream) {
        log::error!("control loop ended: {err}");
    }
}

fn run_control_loop(stream: UnixStream) -> std::io::Result<()> {
    let mut writer = stream.try_clone()?;
    let reader = BufReader::new(stream);

    // TODO(stage 2): construct the Wayland connection + Ultralight renderer here
    // and hand them to a surface registry the command handlers mutate.
    // let mut wayland = wayland::Connection::new()?;
    // let mut renderer = ultralight::Renderer::new()?;
    // let mut surfaces = surface::Registry::new();

    for line in reader.lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }

        let command: Command = match serde_json::from_str(&line) {
            Ok(command) => command,
            Err(err) => {
                log::warn!("bad command {line:?}: {err}");
                continue;
            }
        };

        handle_command(command, &mut writer);
    }

    Ok(())
}

fn handle_command(command: Command, writer: &mut UnixStream) {
    match command {
        Command::Create { role, url, .. } => {
            // TODO(stage 2): surfaces.create(&mut wayland, &mut renderer, spec)
            log::info!("create surface {role} -> {url}");
            emit(writer, Event::Ready { role });
        }
        Command::Exclusive { role, edge, size } => {
            log::info!("exclusive {role} {edge:?} {size}");
            // TODO(stage 5): surfaces.get(&role).set_exclusive(edge, size)
        }
        Command::Region { role, rects } => {
            log::info!("region {role} {} rects", rects.len());
            // TODO(stage 4): surfaces.get(&role).set_input_region(rects)
        }
        Command::Show { role } => log::info!("show {role}"),
        Command::Hide { role } => log::info!("hide {role}"),
        Command::Destroy { role } => log::info!("destroy {role}"),
    }
}

fn emit(writer: &mut UnixStream, event: Event) {
    if let Ok(mut json) = serde_json::to_string(&event) {
        json.push('\n');
        let _ = writer.write_all(json.as_bytes());
    }
}
