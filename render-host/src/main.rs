//! neobar CEF render host (C1 bring-up).
//!
//! Subprocesses (render/gpu/utility) re-exec this same binary; the first thing
//! main() does is hand off to CEF's execute_process and exit if this is one of
//! them. Only the browser process continues to bring up the engine.

mod cef_engine;

use cef::args::Args;

fn main() {
    env_logger::init();

    // Register the API version this binary was built against, before any CEF
    // object is created — otherwise libcef rejects our handler structs with
    // "invalid version -1".
    let _ = cef::api_hash(cef::sys::CEF_API_VERSION_LAST, 0);

    // Subprocess handoff. Returns >= 0 in a CEF child process (which then exits);
    // returns -1 in the browser process, which continues below.
    let args = Args::new();
    let exit_code = cef::execute_process(Some(args.as_main_args()), None, std::ptr::null_mut());
    if exit_code >= 0 {
        std::process::exit(exit_code);
    }

    let url = std::env::args()
        .skip(1)
        .find(|arg| arg.starts_with("http") || arg.starts_with("data:"))
        .unwrap_or_else(|| "https://example.com".to_string());

    log::info!("neobar-render (CEF) browser process starting; url={url}");
    cef_engine::run_c1(&url);
}
