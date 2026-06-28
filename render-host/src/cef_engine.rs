//! CEF off-screen engine: initialize CEF and expose per-surface browser views
//! whose paints land in a shared frame buffer the wl_shm present reads.
//!
//! Flow is push-based: CEF calls `on_paint` (on the main thread, during
//! `do_message_loop_work`) with a BGRA buffer + dirty rects; we copy it into the
//! view's `FrameState` and bump a generation counter. The Wayland frame callback
//! later copies the latest frame into a wl_shm buffer. CEF's own windowless timer
//! is set to 144fps so OSR is not capped (the default is 30).

use std::cell::RefCell;
use std::os::raw::c_int;
use std::rc::Rc;

use cef::args::Args;
use cef::rc::Rc as _;
use cef::{
    browser_host_create_browser_sync, do_message_loop_work, initialize, shutdown, wrap_app,
    wrap_client, wrap_display_handler, wrap_load_handler, wrap_render_handler, App, Browser,
    BrowserSettings, CefString, Client, CommandLine, DisplayHandler, Errorcode, Frame, ImplApp,
    ImplBrowser, ImplBrowserHost, ImplClient, ImplCommandLine, ImplDisplayHandler, ImplLoadHandler,
    ImplRenderHandler, KeyEvent, KeyEventType, LoadHandler, LogSeverity, MouseButtonType,
    MouseEvent, PaintElementType, Rect, RenderHandler, Settings, WindowInfo, WrapApp, WrapClient,
    WrapDisplayHandler, WrapLoadHandler, WrapRenderHandler,
};

/// Target OSR frame rate. CEF's windowless default is 30; raise it so the engine
/// is not the cap (the whole reason for moving off free Ultralight).
const WINDOWLESS_FRAME_RATE: i32 = 144;

/// Shared paint state between a view's RenderHandler and its surface.
pub struct FrameState {
    /// BGRA pixels, `width * height * 4` bytes.
    pub data: Vec<u8>,
    pub width: i32,
    pub height: i32,
    /// Union of dirty rects since the last present (left, top, right, bottom).
    pub dirty: Option<(i32, i32, i32, i32)>,
    /// Bumped on every paint so the surface can detect new frames.
    pub generation: u64,
    /// Size CEF should render at; returned from get_view_rect.
    pub requested: (i32, i32),
}

pub type SharedFrame = Rc<RefCell<FrameState>>;

fn new_shared_frame(width: i32, height: i32) -> SharedFrame {
    Rc::new(RefCell::new(FrameState {
        data: Vec::new(),
        width: 0,
        height: 0,
        dirty: None,
        generation: 0,
        requested: (width.max(1), height.max(1)),
    }))
}

wrap_render_handler! {
    pub struct NeobarRenderHandler {
        frame: SharedFrame,
    }

    impl RenderHandler {
        fn view_rect(&self, _browser: Option<&mut Browser>, rect: Option<&mut Rect>) {
            if let Some(rect) = rect {
                let (width, height) = self.frame.borrow().requested;
                rect.x = 0;
                rect.y = 0;
                rect.width = width;
                rect.height = height;
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
            if buffer.is_null() || width <= 0 || height <= 0 {
                return;
            }
            let len = width as usize * height as usize * 4;
            let src = unsafe { std::slice::from_raw_parts(buffer, len) };

            let mut frame = self.frame.borrow_mut();
            frame.data.resize(len, 0);
            frame.data.copy_from_slice(src);
            frame.width = width;
            frame.height = height;
            // Accumulate dirty across paints until a present consumes it.
            let new_dirty = union_dirty(dirty_rects, width, height);
            frame.dirty = union_opt(frame.dirty, new_dirty);
            frame.generation += 1;
        }
    }
}

/// Union two optional dirty rects (left, top, right, bottom).
pub fn union_opt(
    a: Option<(i32, i32, i32, i32)>,
    b: Option<(i32, i32, i32, i32)>,
) -> Option<(i32, i32, i32, i32)> {
    match (a, b) {
        (None, x) | (x, None) => x,
        (Some(a), Some(b)) => Some((
            a.0.min(b.0),
            a.1.min(b.1),
            a.2.max(b.2),
            a.3.max(b.3),
        )),
    }
}

/// Union the dirty rects into one bounding box (left, top, right, bottom). Falls
/// back to the full frame if no rects are reported.
fn union_dirty(dirty_rects: Option<&[Rect]>, width: i32, height: i32) -> Option<(i32, i32, i32, i32)> {
    let rects = dirty_rects.filter(|r| !r.is_empty());
    let Some(rects) = rects else {
        return Some((0, 0, width, height));
    };
    let mut left = i32::MAX;
    let mut top = i32::MAX;
    let mut right = 0;
    let mut bottom = 0;
    for rect in rects {
        left = left.min(rect.x);
        top = top.min(rect.y);
        right = right.max(rect.x + rect.width);
        bottom = bottom.max(rect.y + rect.height);
    }
    Some((left, top, right, bottom))
}

wrap_display_handler! {
    pub struct NeobarDisplayHandler;

    impl DisplayHandler {
        fn on_console_message(
            &self,
            _browser: Option<&mut Browser>,
            _level: LogSeverity,
            message: Option<&CefString>,
            source: Option<&CefString>,
            line: c_int,
        ) -> c_int {
            let message = message.map(|s| s.to_string()).unwrap_or_default();
            let source = source.map(|s| s.to_string()).unwrap_or_default();
            log::info!("console: {message} ({source}:{line})");
            0
        }
    }
}

wrap_load_handler! {
    pub struct NeobarLoadHandler;

    impl LoadHandler {
        fn on_load_end(
            &self,
            _browser: Option<&mut Browser>,
            _frame: Option<&mut Frame>,
            http_status_code: c_int,
        ) {
            log::info!("load end: http {http_status_code}");
        }

        fn on_load_error(
            &self,
            _browser: Option<&mut Browser>,
            _frame: Option<&mut Frame>,
            error_code: Errorcode,
            error_text: Option<&CefString>,
            failed_url: Option<&CefString>,
        ) {
            let error_text = error_text.map(|s| s.to_string()).unwrap_or_default();
            let failed_url = failed_url.map(|s| s.to_string()).unwrap_or_default();
            log::error!("load error {error_code:?}: {error_text} ({failed_url})");
        }
    }
}

wrap_client! {
    pub struct NeobarClient {
        render_handler: RenderHandler,
        display_handler: DisplayHandler,
        load_handler: LoadHandler,
    }

    impl Client {
        fn render_handler(&self) -> Option<RenderHandler> {
            Some(self.render_handler.clone())
        }

        fn display_handler(&self) -> Option<DisplayHandler> {
            Some(self.display_handler.clone())
        }

        fn load_handler(&self) -> Option<LoadHandler> {
            Some(self.load_handler.clone())
        }
    }
}

/// One CEF browser rendering off-screen into a shared frame buffer.
pub struct CefView {
    browser: Browser,
    frame: SharedFrame,
}

impl CefView {
    pub fn new(url: &str, width: i32, height: i32) -> Option<CefView> {
        let frame = new_shared_frame(width, height);
        let render_handler = NeobarRenderHandler::new(frame.clone());
        let display_handler = NeobarDisplayHandler::new();
        let load_handler = NeobarLoadHandler::new();
        let mut client = NeobarClient::new(render_handler, display_handler, load_handler);

        // external_begin_frame_enabled lifts CEF's ~60fps internal OSR pacing:
        // with it, paints (and the page's requestAnimationFrame) are driven by our
        // send_external_begin_frame calls instead of CEF's internal timer, so the
        // surface can render at the display's refresh rate. The present loop sends
        // one begin-frame per Wayland frame callback (see surface.rs).
        let window_info = WindowInfo {
            external_begin_frame_enabled: 1,
            ..WindowInfo::default().set_as_windowless(0)
        };
        let url = CefString::from(url);
        let browser_settings = BrowserSettings::default();

        let browser = browser_host_create_browser_sync(
            Some(&window_info),
            Some(&mut client),
            Some(&url),
            Some(&browser_settings),
            None,
            None,
        )?;

        if let Some(host) = browser.host() {
            host.set_windowless_frame_rate(WINDOWLESS_FRAME_RATE);
        }
        Some(CefView { browser, frame })
    }

    /// Request the next off-screen frame. With external_begin_frame_enabled CEF
    /// only paints in response to this, so it must be called once per display
    /// frame to drive rendering (and the page's requestAnimationFrame) at refresh
    /// rate rather than CEF's ~60fps internal cap.
    pub fn send_begin_frame(&self) {
        if let Some(host) = self.browser.host() {
            host.send_external_begin_frame();
        }
    }

    /// Resize the rendered view; CEF repaints at the new size.
    pub fn resize(&self, width: i32, height: i32) {
        {
            let mut frame = self.frame.borrow_mut();
            frame.requested = (width.max(1), height.max(1));
        }
        if let Some(host) = self.browser.host() {
            host.was_resized();
        }
    }

    pub fn frame(&self) -> &SharedFrame {
        &self.frame
    }

    pub fn generation(&self) -> u64 {
        self.frame.borrow().generation
    }

    pub fn frame_empty(&self) -> bool {
        self.frame.borrow().data.is_empty()
    }

    /// Take and clear the accumulated dirty region for this present.
    pub fn take_dirty(&self) -> Option<(i32, i32, i32, i32)> {
        self.frame.borrow_mut().dirty.take()
    }

    pub fn send_mouse_move(&self, x: i32, y: i32, leave: bool) {
        if let Some(host) = self.browser.host() {
            let event = MouseEvent { x, y, modifiers: 0 };
            host.send_mouse_move_event(Some(&event), leave as c_int);
        }
    }

    pub fn send_mouse_button(&self, x: i32, y: i32, button: MouseButtonType, mouse_up: bool) {
        if let Some(host) = self.browser.host() {
            let event = MouseEvent { x, y, modifiers: 0 };
            host.send_mouse_click_event(Some(&event), button, mouse_up as c_int, 1);
        }
    }

    pub fn send_scroll(&self, x: i32, y: i32, delta_x: i32, delta_y: i32) {
        if let Some(host) = self.browser.host() {
            let event = MouseEvent { x, y, modifiers: 0 };
            host.send_mouse_wheel_event(Some(&event), delta_x, delta_y);
        }
    }

    /// Fire a RawKeyDown/KeyUp with a Windows virtual key code.
    pub fn send_key(&self, type_: KeyEventType, windows_key_code: i32) {
        if let Some(host) = self.browser.host() {
            let event = KeyEvent {
                type_,
                windows_key_code,
                native_key_code: 0,
                character: 0,
                unmodified_character: 0,
                ..Default::default()
            };
            host.send_key_event(Some(&event));
        }
    }

    /// Fire Char events for text (one per utf16 code unit) — drives text input.
    pub fn send_text(&self, text: &str) {
        let Some(host) = self.browser.host() else {
            return;
        };
        for unit in text.encode_utf16() {
            let event = KeyEvent {
                type_: KeyEventType::CHAR,
                windows_key_code: unit as i32,
                native_key_code: 0,
                character: unit,
                unmodified_character: unit,
                ..Default::default()
            };
            host.send_key_event(Some(&event));
        }
    }
}

wrap_app! {
    pub struct NeobarApp;

    impl App {
        fn on_before_command_line_processing(
            &self,
            _process_type: Option<&CefString>,
            command_line: Option<&mut CommandLine>,
        ) {
            if let Some(command_line) = command_line {
                apply_memory_switches(command_line);
            }
        }
    }
}

/// Append Chromium switches that trim CEF's resident memory. CEF is full Chromium
/// and spins up several processes (browser, gpu, renderer, utility) plus many
/// background subsystems a desktop shell never uses; disabling them and capping
/// the renderer count is the bulk of the saving.
///
/// GPU compositing stays on by default because animation smoothness is the whole
/// reason for CEF. Two env vars trade smoothness for more RAM:
///   NEOBAR_CEF_DISABLE_GPU=1       software rendering, drops the GPU process
///   NEOBAR_CEF_SINGLE_PROCESS=1    everything in one process (lowest RAM, less stable)
fn apply_memory_switches(command_line: &mut CommandLine) {
    const SWITCHES: &[&str] = &[
        "disable-extensions",
        "disable-component-update",
        "disable-background-networking",
        "disable-breakpad",
        "disable-domain-reliability",
        "no-pings",
        // No zygote fork server: one fewer resident process. Safe with no-sandbox.
        "no-zygote",
    ];
    for switch in SWITCHES {
        command_line.append_switch(Some(&CefString::from(*switch)));
    }

    // One page, so one renderer is enough; the default lets Chromium spawn more.
    append_switch_value(command_line, "renderer-process-limit", "1");

    // Background subsystems a shell never uses; each costs memory/threads.
    append_switch_value(
        command_line,
        "disable-features",
        "Translate,OptimizationHints,MediaRouter,InterestFeedContentSuggestions,\
         CalculateNativeWinOcclusion,OptimizationTargetPrediction,DialMediaRouteProvider,\
         AcceptCHFrame,GlobalMediaControls",
    );

    if std::env::var_os("NEOBAR_CEF_DISABLE_GPU").is_some() {
        command_line.append_switch(Some(&CefString::from("disable-gpu")));
        command_line.append_switch(Some(&CefString::from("disable-gpu-compositing")));
    }
    if std::env::var_os("NEOBAR_CEF_SINGLE_PROCESS").is_some() {
        command_line.append_switch(Some(&CefString::from("single-process")));
    }
}

fn append_switch_value(command_line: &mut CommandLine, name: &str, value: &str) {
    command_line.append_switch_with_value(Some(&CefString::from(name)), Some(&CefString::from(value)));
}

/// Build the CEF app handler shared by the subprocess launcher and the browser
/// process so the same switches apply everywhere.
pub fn new_app() -> App {
    NeobarApp::new()
}

/// The CEF runtime (initialized once per process).
pub struct Engine;

impl Engine {
    pub fn init() -> Engine {
        let args = Args::new();
        let settings = Settings {
            windowless_rendering_enabled: 1,
            external_message_pump: 1,
            no_sandbox: 1,
            ..Default::default()
        };
        let mut app = new_app();
        let ok = initialize(
            Some(args.as_main_args()),
            Some(&settings),
            Some(&mut app),
            std::ptr::null_mut(),
        );
        log::info!("cef initialize -> {ok}");
        Engine
    }

    pub fn shutdown(self) {
        shutdown();
    }
}

/// Pump CEF's message loop once. Drives paint timers and delivers on_paint.
/// Called from a calloop timer on the main thread.
pub fn pump() {
    do_message_loop_work();
}
