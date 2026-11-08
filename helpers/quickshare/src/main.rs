// neoshell-quickshare: Quick Share (Nearby Share) for neoshell through rqs_lib.
// Commands arrive on stdin and events leave on stdout, one JSON object per
// line; logs go to stderr. Licensed GPL-3.0-only, as rqs_lib is.

mod arguments;
mod endpoints;
mod helper;
mod protocol;
mod transfers;

use std::io::IsTerminal;
use std::process::ExitCode;

use tracing_subscriber::EnvFilter;

use crate::arguments::{Arguments, USAGE};
use crate::helper::Helper;
use crate::protocol::emit_error;

const DEFAULT_LOG_FILTER: &str =
    "info,mdns_sd=error,polling=error,neli=error,bluez_async=error,btleplug=error";

#[tokio::main]
async fn main() -> ExitCode {
    initialize_logging();

    let raw_arguments: Vec<String> = std::env::args().skip(1).collect();
    if raw_arguments
        .iter()
        .any(|argument| argument == "--help" || argument == "-h")
    {
        println!("{USAGE}");
        return ExitCode::SUCCESS;
    }
    let arguments = match Arguments::parse(raw_arguments.into_iter()) {
        Ok(arguments) => arguments,
        Err(message) => {
            eprintln!("{message}\n{USAGE}");
            return ExitCode::from(2);
        }
    };

    let helper = match Helper::start(arguments).await {
        Ok(helper) => helper,
        Err(error) => {
            emit_error(format!(
                "starting the Quick Share service failed: {error:#}"
            ));
            return ExitCode::FAILURE;
        }
    };
    if let Err(error) = helper.run().await {
        emit_error(format!("{error:#}"));
        return ExitCode::FAILURE;
    }
    exit_without_waiting_for_library_threads()
}

fn initialize_logging() {
    let filter = match std::env::var("RUST_LOG") {
        Ok(_) => EnvFilter::builder().from_env_lossy(),
        Err(_) => EnvFilter::builder().parse_lossy(DEFAULT_LOG_FILTER),
    };
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_ansi(std::io::stderr().is_terminal())
        .with_env_filter(filter)
        .init();
}

/// The service is already stopped; the mDNS daemon thread and blocking stdin
/// reader would otherwise keep the runtime from shutting down promptly.
fn exit_without_waiting_for_library_threads() -> ! {
    std::process::exit(0)
}
