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
    browser_host_create_browser_sync, do_message_loop_work, initialize, shutdown, wrap_client,
    wrap_render_handler, Browser, BrowserSettings, CefString, Client, ImplBrowser, ImplBrowserHost,
    ImplClient, ImplRenderHandler, KeyEvent, KeyEventType, MouseButtonType, MouseEvent,
    PaintElementType, Rect, RenderHandler, Settings, WindowInfo, WrapClient, WrapRenderHandler,
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
            frame.dirty = union_dirty(dirty_rects, width, height);
            frame.generation += 1;
        }
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

/// One CEF browser rendering off-screen into a shared frame buffer.
pub struct CefView {
    browser: Browser,
    frame: SharedFrame,
}

impl CefView {
    pub fn new(url: &str, width: i32, height: i32) -> Option<CefView> {
        let frame = new_shared_frame(width, height);
        let render_handler = NeobarRenderHandler::new(frame.clone());
        let mut client = NeobarClient::new(render_handler);

        let window_info = WindowInfo::default().set_as_windowless(0);
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
        let ok = initialize(Some(args.as_main_args()), Some(&settings), None, std::ptr::null_mut());
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
