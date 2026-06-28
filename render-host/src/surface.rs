//! Per-role surface: a wlr-layer-shell surface presenting a CEF view's latest
//! paint through a wl_shm buffer. The view is push-painted by CEF; we copy the
//! shared frame buffer on each Wayland frame callback, skipping idle frames.

use smithay_client_toolkit::shell::wlr_layer::{
    Anchor, KeyboardInteractivity, Layer as SctkLayer, LayerSurface,
};
use smithay_client_toolkit::shell::WaylandSurface;
use smithay_client_toolkit::shm::slot::SlotPool;
use smithay_client_toolkit::shm::Shm;
use wayland_client::protocol::wl_shm;
use wayland_client::QueueHandle;

use std::time::{Duration, Instant};

use crate::cef_engine::CefView;
use crate::protocol::{Edge, Keyboard, Layer};
use crate::wayland::State;

/// While the view painted or took input within this window, begin-frames run at
/// full refresh rate for smooth animation.
const ACTIVE_WINDOW: Duration = Duration::from_millis(250);

/// When idle, send a begin-frame only this often (~10Hz) to catch the next
/// change. Keeps idle GPU near zero while staying responsive.
const IDLE_PROBE_PERIOD: Duration = Duration::from_millis(100);

/// Resolved spec for creating a surface (from `Command::Create`).
pub struct SurfaceSpec {
    pub role: String,
    pub url: String,
    pub monitor: String,
    pub layer: Layer,
    pub anchors: Vec<Edge>,
    pub width: i32,
    pub height: i32,
    pub keyboard: Keyboard,
    pub exclusive_edge: Option<Edge>,
    pub exclusive_size: i32,
}

/// A live surface: layer-shell handle + CEF view + its shm pool.
pub struct ManagedSurface {
    pub role: String,
    pub layer: LayerSurface,
    pub view: CefView,
    pool: Option<SlotPool>,
    width: u32,
    height: u32,
    configured: bool,
    mapped: bool,
    last_generation: u64,
    /// Dirty region from the previous present. We alternate two shm slots, so a
    /// slot reused now is two frames stale; damaging current ∪ previous covers it.
    prev_dirty: Option<(i32, i32, i32, i32)>,
    /// Last time an idle begin-frame probe was sent (see present()).
    last_idle_probe: Instant,
}

impl ManagedSurface {
    pub fn new(role: String, layer: LayerSurface, view: CefView) -> Self {
        Self {
            role,
            layer,
            view,
            pool: None,
            width: 0,
            height: 0,
            configured: false,
            mapped: false,
            last_generation: 0,
            prev_dirty: None,
            last_idle_probe: Instant::now(),
        }
    }

    /// Apply a layer-surface configure: adopt the compositor-chosen size and
    /// resize the CEF view to match.
    pub fn configure(&mut self, width: u32, height: u32) {
        if width != 0 {
            self.width = width;
        }
        if height != 0 {
            self.height = height;
        }
        self.configured = true;
        if self.width > 0 && self.height > 0 {
            self.view.resize(self.width as i32, self.height as i32);
        }
    }

    /// Present the view's latest CEF frame. Returns true only when a new frame
    /// was uploaded (so the caller can measure upload rate). Skips the upload
    /// when nothing changed, but still commits a frame request to keep ticking.
    pub fn present(&mut self, shm: &Shm, qh: &QueueHandle<State>) -> bool {
        if !self.configured || self.width == 0 || self.height == 0 {
            return false;
        }

        // Drive CEF's rendering. With external_begin_frame_enabled CEF only paints
        // (and advances requestAnimationFrame) in response to a begin-frame, so the
        // begin-frame rate IS the render rate. Sending one per Wayland frame
        // callback gives full 144fps but composites every frame even when nothing
        // changes — ~70% GPU at idle. So gate it: full rate while the view is
        // active (recent paint or input), and a sparse idle probe otherwise to
        // catch the next change (the clock ticking, async data, a hover starting).
        let idle = self.view.idle_for();
        if idle < ACTIVE_WINDOW {
            self.view.send_begin_frame();
        } else if self.last_idle_probe.elapsed() >= IDLE_PROBE_PERIOD {
            self.view.send_begin_frame();
            self.last_idle_probe = std::time::Instant::now();
        }

        // Is there a new CEF paint since we last presented?
        let generation = self.view.generation();
        let has_new = generation != self.last_generation && !self.view.frame_empty();
        if has_new {
            // A fresh paint keeps the view active, so an animating page (its RAF
            // producing paints) stays at full refresh until it settles.
            self.view.mark_active();
        }
        if !has_new && self.mapped {
            let wl_surface = self.layer.wl_surface();
            wl_surface.frame(qh, wl_surface.clone());
            self.layer.commit();
            return false;
        }

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

        // The dirty region to repaint: this frame's changes plus last frame's,
        // since the slot we're about to reuse is two frames stale. Fall back to
        // the full surface when neither reports a region.
        let current_dirty = self.view.take_dirty();
        let damage_region = crate::cef_engine::union_opt(current_dirty, self.prev_dirty)
            .unwrap_or((0, 0, width as i32, height as i32));

        // Disjoint field borrows: read the view's frame while the pool buffer
        // (which borrows the pool) is live.
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

        // Full-copy keeps every slot's buffer content complete and coherent; the
        // damage rect below limits how much the compositor re-uploads.
        copy_frame_into(view, canvas, width, height, stride);

        let wl_surface = layer.wl_surface();
        if let Err(err) = buffer.attach_to(wl_surface) {
            log::error!("attach: {err}");
            return false;
        }
        let (left, top, right, bottom) = damage_region;
        let x = left.clamp(0, width as i32);
        let y = top.clamp(0, height as i32);
        let w = (right - left).clamp(0, width as i32 - x);
        let h = (bottom - top).clamp(0, height as i32 - y);
        wl_surface.damage_buffer(x, y, w, h);
        wl_surface.frame(qh, wl_surface.clone());
        layer.commit();

        self.mapped = true;
        self.last_generation = generation;
        self.prev_dirty = current_dirty;
        true
    }
}

/// Copy the view's BGRA frame into the shm canvas, clipped to the surface size.
fn copy_frame_into(view: &CefView, canvas: &mut [u8], width: u32, height: u32, dst_stride: u32) {
    let frame = view.frame().borrow();
    if frame.data.is_empty() || frame.width <= 0 || frame.height <= 0 {
        canvas.fill(0);
        return;
    }

    let src_stride = frame.width as u32 * 4;
    let rows = height.min(frame.height as u32) as usize;
    let row_bytes = (width.min(frame.width as u32) * 4) as usize;
    for row in 0..rows {
        let src_start = row * src_stride as usize;
        let dst_start = row * dst_stride as usize;
        canvas[dst_start..dst_start + row_bytes]
            .copy_from_slice(&frame.data[src_start..src_start + row_bytes]);
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
