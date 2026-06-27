//! Per-role surface: a layer-shell `wl_surface` bound to an Ultralight view, with
//! a dmabuf swapchain between them.
//!
//! STAGE 2 target: one `Surface` that ties a `wayland::LayerSurface` to an
//! `ultralight::View` and presents frames. STAGE 5 adds the registry the control
//! commands mutate.

use crate::protocol::{Edge, Keyboard, Layer, Rect};

/// Resolved spec for creating a surface (parsed from `Command::Create`).
pub struct SurfaceSpec {
    pub role: String,
    pub url: String,
    pub monitor: String,
    pub layer: Layer,
    pub anchors: Vec<Edge>,
    pub keyboard: Keyboard,
    pub exclusive_edge: Option<Edge>,
    pub exclusive_size: i32,
}

// TODO(stage 2): implement.
//
// Sketch:
//   pub struct Surface { layer: LayerSurface, view: View, swapchain: DmabufChain }
//   impl Surface {
//       pub fn present(&mut self) {
//           // 1. renderer.update(); renderer.render();
//           // 2. copy/import the view's texture into the next dmabuf
//           // 3. attach wl_buffer, damage, commit
//           // 4. request the next frame callback (drives external_begin_frame)
//       }
//       pub fn set_exclusive(&mut self, edge: Edge, size: i32) { ... }
//       pub fn set_input_region(&mut self, rects: &[Rect]) { ... }
//   }
//
//   pub struct Registry { surfaces: HashMap<String, Surface> }  // keyed by role

/// dmabuf swapchain: a small ring of GBM buffers imported as both an EGLImage
/// (Ultralight/GL render target) and a `wl_buffer` (compositor present). Double
/// or triple buffer so the compositor reads one while we draw the next.
pub struct DmabufChain;
