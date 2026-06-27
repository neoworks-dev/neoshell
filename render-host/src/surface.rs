//! Per-role surface: a wlr-layer-shell surface presenting an Ultralight view's
//! CPU bitmap through a wl_shm buffer (stage 2).

use smithay_client_toolkit::shell::wlr_layer::{
    Anchor, KeyboardInteractivity, Layer as SctkLayer, LayerSurface,
};
use smithay_client_toolkit::shell::WaylandSurface;
use smithay_client_toolkit::shm::slot::SlotPool;
use smithay_client_toolkit::shm::Shm;
use wayland_client::protocol::wl_shm;
use wayland_client::QueueHandle;

use crate::protocol::{Edge, Keyboard, Layer};
use crate::ultralight::View;
use crate::wayland::State;

/// Resolved spec for creating a surface (from `Command::Create`).
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

/// A live surface: layer-shell handle + Ultralight view + its shm pool.
pub struct ManagedSurface {
    pub role: String,
    pub layer: LayerSurface,
    pub view: View,
    pool: Option<SlotPool>,
    width: u32,
    height: u32,
    configured: bool,
}

impl ManagedSurface {
    pub fn new(role: String, layer: LayerSurface, view: View) -> Self {
        Self {
            role,
            layer,
            view,
            pool: None,
            width: 0,
            height: 0,
            configured: false,
        }
    }

    /// Apply a layer-surface configure: adopt the compositor-chosen size and
    /// resize the view to match.
    pub fn configure(&mut self, width: u32, height: u32) {
        // A zero dimension means "you decide" — keep our requested size.
        if width != 0 {
            self.width = width;
        }
        if height != 0 {
            self.height = height;
        }
        self.configured = true;
        if self.width > 0 && self.height > 0 {
            self.view.resize(self.width, self.height);
        }
    }

    /// Set the requested size before the first commit (e.g. a fixed bar height).
    /// Used once roles get explicit sizing in stage 5.
    #[allow(dead_code)]
    pub fn request_size(&mut self, width: u32, height: u32) {
        self.width = width;
        self.height = height;
        self.layer.set_size(width, height);
    }

    /// Render the view and present it. Returns false if not ready yet.
    /// `renderer_update_render` must already have been called this frame.
    pub fn present(&mut self, shm: &Shm, qh: &QueueHandle<State>) -> bool {
        if !self.configured || self.width == 0 || self.height == 0 {
            return false;
        }

        // Always copy the view's current surface and present. render() (called by
        // the caller before this) clears the view's paint flag, so gating the
        // copy on needs_paint() would miss content that loaded asynchronously.
        // TODO(stage 3): only reupload when the Ultralight surface's dirty bounds
        // are non-empty, to avoid copying unchanged frames.
        let width = self.width;
        let height = self.height;
        let stride = width * 4;

        if self.pool.is_none() {
            match SlotPool::new((stride * height) as usize, shm) {
                Ok(pool) => self.pool = Some(pool),
                Err(err) => {
                    log::error!("slot pool {}: {err}", self.role);
                    return false;
                }
            }
        }

        // Disjoint field borrows so the view's bitmap can be read while the pool
        // buffer (which borrows the pool) is live.
        let Self {
            view, pool, layer, ..
        } = self;
        let pool = pool.as_mut().expect("pool ensured above");

        let buffer_result = pool.create_buffer(
            width as i32,
            height as i32,
            stride as i32,
            wl_shm::Format::Argb8888,
        );
        let (buffer, canvas) = match buffer_result {
            Ok(pair) => pair,
            Err(err) => {
                log::error!("create_buffer: {err}");
                return false;
            }
        };

        copy_bitmap_into(view, canvas, width, height, stride);

        let wl_surface = layer.wl_surface();
        if let Err(err) = buffer.attach_to(wl_surface) {
            log::error!("attach: {err}");
            return false;
        }
        wl_surface.damage_buffer(0, 0, width as i32, height as i32);
        wl_surface.frame(qh, wl_surface.clone());
        layer.commit();
        true
    }
}

/// Copy the view's BGRA bitmap into the shm canvas, row by row (strides differ).
fn copy_bitmap_into(view: &View, canvas: &mut [u8], width: u32, height: u32, dst_stride: u32) {
    let copied = view.with_bitmap(|bitmap| {
        let rows = height.min(bitmap.height) as usize;
        let row_bytes = (width.min(bitmap.width) * 4) as usize;
        for row in 0..rows {
            let src_start = row * bitmap.stride as usize;
            let dst_start = row * dst_stride as usize;
            let src = &bitmap.pixels[src_start..src_start + row_bytes];
            canvas[dst_start..dst_start + row_bytes].copy_from_slice(src);
        }
    });
    if copied.is_none() {
        // No CPU surface — clear to transparent so we present *something*.
        canvas.fill(0);
    }
}

pub fn to_sctk_layer(layer: Layer) -> SctkLayer {
    match layer {
        Layer::Background => SctkLayer::Background,
        Layer::Bottom => SctkLayer::Bottom,
        Layer::Top => SctkLayer::Top,
        Layer::Overlay => SctkLayer::Overlay,
    }
}

pub fn to_sctk_anchor(edges: &[Edge]) -> Anchor {
    let mut anchor = Anchor::empty();
    for edge in edges {
        anchor |= match edge {
            Edge::Top => Anchor::TOP,
            Edge::Bottom => Anchor::BOTTOM,
            Edge::Left => Anchor::LEFT,
            Edge::Right => Anchor::RIGHT,
        };
    }
    anchor
}

pub fn to_sctk_keyboard(keyboard: Keyboard) -> KeyboardInteractivity {
    match keyboard {
        Keyboard::None => KeyboardInteractivity::None,
        Keyboard::OnDemand => KeyboardInteractivity::OnDemand,
        Keyboard::Exclusive => KeyboardInteractivity::Exclusive,
    }
}
