//! Ultralight renderer + per-role views.
//!
//! STAGE 2 target: init the Ultralight `Renderer` in OSR mode and create a view
//! that paints a solid color, exported as a GPU texture. STAGE 3 loads the real
//! frontend URL and wires `external_begin_frame`.
//!
//! Ultralight gives frames one of two ways:
//!   1. CPU bitmap  — `Surface::bitmap()` (simple, a CPU->GPU upload per frame).
//!   2. GPU driver  — a custom `GPUDriver` emitting draw calls into our GL/EGL
//!      context, so the rendered texture can be exported as a dmabuf zero-copy.
//! Start with (1) to prove the pipeline; move to (2) for zero-copy once green.
//!
//! Confirm `ul-next` exposes the chosen path. If it only wraps the high-level
//! `App`/`Window` API (which creates its own GLFW window), drop to `ultralight-sys`
//! and the C `ulCreateRenderer` / `ulViewCreate(..., transparent=true)` path.

// TODO(stage 2): implement.
//
// Sketch:
//   pub struct Renderer { inner: ul_next::renderer::Renderer }
//   pub struct View { inner: ul_next::view::View }
//   impl Renderer {
//       pub fn new() -> anyhow::Result<Self> { /* Config: gpu, transparent */ }
//       pub fn create_view(&self, w: u32, h: u32, url: &str) -> View { ... }
//       pub fn update(&self) { /* ulUpdate — timers, network, JS */ }
//       pub fn render(&self) { /* ulRender — paint dirty views */ }
//   }
//
// Transparency: set the view background transparent so the compositor blur
// (`layerrule = blur, neobar`) shows through. The glass look is compositor-side,
// not CSS — Ultralight has no usable backdrop-filter.
