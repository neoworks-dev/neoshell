//! Ultralight renderer + per-role views (stage 2: CPU bitmap path).
//!
//! The renderer is created once. Each surface owns a `View`. Per frame we call
//! `renderer.update()` (timers/network/JS) then `renderer.render()` (paints dirty
//! views into their CPU surfaces), and copy each view's BGRA bitmap into a wl_shm
//! buffer (see surface.rs).
//!
//! Pixel format: Ultralight CPU surfaces are BGRA, premultiplied alpha — which
//! matches wl_shm `Argb8888` byte order on little-endian. No conversion needed.
//!
//! NOTE: method names below target ul-next 0.4. Verify against the installed
//! crate version on first `cargo build`; the wrapper API has shifted across
//! releases. Spots likely to need a tweak are marked `API?`.

use ul_next::{
    config::Config,
    platform,
    renderer::Renderer as UlRenderer,
    view::{View as UlView, ViewConfig},
};

/// Owns the single Ultralight renderer instance.
pub struct Renderer {
    inner: UlRenderer,
}

impl Renderer {
    /// Initialize Ultralight platform handlers and create the renderer.
    /// `resources_dir` must contain the SDK's `resources/` (icudt*.dat, etc.).
    pub fn new(resources_dir: &str) -> Result<Self, String> {
        // Platform handlers must be set before the renderer is created.
        platform::enable_platform_fontloader();
        platform::enable_platform_filesystem(resources_dir)
            .map_err(|err| format!("ultralight filesystem: {err:?}"))?;

        let config = Config::start()
            .build()
            .ok_or("failed to build ultralight config")?;
        let inner = UlRenderer::create(config).map_err(|err| format!("ul renderer: {err:?}"))?;

        Ok(Self { inner })
    }

    /// Create a transparent, CPU-rendered view of the given pixel size.
    pub fn create_view(&self, width: u32, height: u32) -> Result<View, String> {
        let view_config = ViewConfig::start()
            .initial_device_scale(1.0)
            .is_accelerated(false) // CPU surface (stage 2); GPU is stage 3.5
            .is_transparent(true) // compositor blur shows through
            .build()
            .ok_or("failed to build view config")?;

        let inner = self
            .inner
            .create_view(width, height, &view_config, None)
            .ok_or("failed to create view")?;

        Ok(View { inner })
    }

    /// Advance timers/network/JS. Call once per frame before `render`.
    pub fn update(&self) {
        self.inner.update();
    }

    /// Paint all dirty views into their CPU surfaces.
    pub fn render(&self) {
        self.inner.render();
    }
}

/// A single Ultralight view (one per surface).
pub struct View {
    inner: UlView,
}

/// A borrowed snapshot of a view's CPU bitmap for one present.
pub struct Bitmap<'a> {
    pub width: u32,
    pub height: u32,
    /// Bytes per row (may exceed width*4 due to alignment).
    pub stride: u32,
    /// BGRA premultiplied pixels, `stride * height` bytes.
    pub pixels: &'a [u8],
}

impl View {
    pub fn load_url(&self, url: &str) -> Result<(), String> {
        self.inner
            .load_url(url)
            .map_err(|err| format!("load_url {url}: {err:?}"))
    }

    pub fn resize(&self, width: u32, height: u32) {
        self.inner.resize(width, height);
    }

    /// True if the view repainted since the last present, so we only reupload
    /// the wl_shm buffer when pixels actually changed.
    pub fn needs_paint(&self) -> bool {
        self.inner.needs_paint()
    }

    /// Run `f` with the view's current CPU bitmap. Returns None if the view has
    /// no CPU surface (e.g. accidentally created accelerated).
    ///
    /// API?: in ul-next the CPU surface is reachable via `view.surface()` then a
    /// bitmap accessor; the exact locking call may differ by version.
    pub fn with_bitmap<R>(&self, f: impl FnOnce(Bitmap) -> R) -> Option<R> {
        let mut surface = self.inner.surface()?;
        let width = surface.width();
        let height = surface.height();
        let stride = surface.row_bytes();
        let locked = surface.lock_pixels()?; // guard derefs to &[u8]
        let bitmap = Bitmap {
            width,
            height,
            stride,
            pixels: &locked,
        };
        Some(f(bitmap))
    }
}
