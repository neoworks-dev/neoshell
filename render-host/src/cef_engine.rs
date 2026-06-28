//! CEF off-screen engine (C1 bring-up).
//!
//! Initializes CEF, creates a single windowless browser, and logs `on_paint` to
//! prove the pipeline. The wl_shm/layer-shell integration comes in C2; for now
//! the view size is fixed and paints are only logged.

use std::os::raw::c_int;
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::{Duration, Instant};

use cef::args::Args;
use cef::rc::Rc as _;
use cef::{
    browser_host_create_browser_sync, do_message_loop_work, initialize, shutdown, wrap_client,
    wrap_render_handler, Browser, BrowserSettings, CefString, Client, ImplClient,
    ImplRenderHandler, PaintElementType, Rect, RenderHandler, Settings, WindowInfo, WrapClient,
    WrapRenderHandler,
};

const VIEW_WIDTH: i32 = 1280;
const VIEW_HEIGHT: i32 = 720;

wrap_render_handler! {
    pub struct NeobarRenderHandler;

    impl RenderHandler {
        fn view_rect(&self, _browser: Option<&mut Browser>, rect: Option<&mut Rect>) {
            if let Some(rect) = rect {
                rect.x = 0;
                rect.y = 0;
                rect.width = VIEW_WIDTH;
                rect.height = VIEW_HEIGHT;
            }
        }

        fn on_paint(
            &self,
            _browser: Option<&mut Browser>,
            _type_: PaintElementType,
            dirty_rects: Option<&[Rect]>,
            buffer: *const u8,
            width: c_int,
            height: c_int,
        ) {
            log_paint(dirty_rects, buffer, width, height);
        }
    }
}

wrap_client! {
    pub struct NeobarClient {
        render_handler: RenderHandler,
    }

    impl Client {
        fn render_handler(&self) -> Option<RenderHandler> {
            Some(self.render_handler.clone())
        }
    }
}

/// Log the first few paints with a sampled center pixel (BGRA) to prove OSR works.
fn log_paint(dirty_rects: Option<&[Rect]>, buffer: *const u8, width: c_int, height: c_int) {
    static COUNT: AtomicU32 = AtomicU32::new(0);
    if COUNT.fetch_add(1, Ordering::Relaxed) >= 5 {
        return;
    }
    if buffer.is_null() || width <= 0 || height <= 0 {
        log::warn!("on_paint: empty buffer {width}x{height}");
        return;
    }
    let stride = width as usize * 4;
    let mid = (height as usize / 2) * stride + (width as usize / 2) * 4;
    let pixel = unsafe { std::slice::from_raw_parts(buffer.add(mid), 4) };
    let rects = dirty_rects.map(|r| r.len()).unwrap_or(0);
    log::info!(
        "on_paint {width}x{height} dirty_rects={rects} center BGRA={pixel:?}"
    );
}

/// C1: init CEF, create one windowless browser, pump the loop briefly.
pub fn run_c1(url: &str) {
    let args = Args::new();
    let settings = Settings {
        windowless_rendering_enabled: 1,
        external_message_pump: 1,
        no_sandbox: 1,
        ..Default::default()
    };

    let initialized = initialize(Some(args.as_main_args()), Some(&settings), None, std::ptr::null_mut());
    log::info!("cef initialize -> {initialized}");

    let window_info = WindowInfo::default().set_as_windowless(0);
    let render_handler = NeobarRenderHandler::new();
    let mut client = NeobarClient::new(render_handler);
    let url = CefString::from(url);
    let browser_settings = BrowserSettings::default();

    let browser = browser_host_create_browser_sync(
        Some(&window_info),
        Some(&mut client),
        Some(&url),
        Some(&browser_settings),
        None,
        None,
    );
    log::info!("browser created: {}", browser.is_some());

    let start = Instant::now();
    while start.elapsed() < Duration::from_secs(6) {
        do_message_loop_work();
        std::thread::sleep(Duration::from_millis(5));
    }

    shutdown();
}
