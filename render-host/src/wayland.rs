//! Wayland connection state, wlr-layer-shell, wl_shm, and command handling.
//!
//! `State` owns the live surfaces and implements the smithay-client-toolkit
//! handler traits. CEF paints into each view's shared frame buffer on the pump
//! timer; the Wayland frame callback presents the latest frame via wl_shm.
//!
//! Render-only for C2/C3. Seat/input handling is added in C4.

use std::collections::HashMap;

use smithay_client_toolkit::compositor::{CompositorHandler, CompositorState, Region};
use smithay_client_toolkit::output::{OutputHandler, OutputState};
use smithay_client_toolkit::registry::{ProvidesRegistryState, RegistryState};
use smithay_client_toolkit::shell::wlr_layer::{
    LayerShell, LayerShellHandler, LayerSurface, LayerSurfaceConfigure,
};
use smithay_client_toolkit::shell::WaylandSurface;
use smithay_client_toolkit::shm::{Shm, ShmHandler};
use smithay_client_toolkit::{
    delegate_compositor, delegate_layer, delegate_output, delegate_registry, delegate_shm,
    registry_handlers,
};
use wayland_client::globals::GlobalList;
use wayland_client::protocol::{wl_output, wl_surface};
use wayland_client::{Connection, QueueHandle};

use crate::cef_engine::CefView;
use crate::protocol::{Command, Edge, Rect};
use crate::surface::{to_sctk_anchor, to_sctk_keyboard, to_sctk_layer, ManagedSurface, SurfaceSpec};

pub struct State {
    registry_state: RegistryState,
    output_state: OutputState,
    compositor_state: CompositorState,
    layer_shell: LayerShell,
    shm: Shm,
    qh: QueueHandle<State>,

    surfaces: HashMap<String, ManagedSurface>,

    // Objective sampling: total frame callbacks vs frames that actually uploaded
    // a new buffer (the rest are idle frame-request commits).
    frames: u32,
    uploads: u32,
    fps_since: std::time::Instant,
}

impl State {
    pub fn new(globals: &GlobalList, qh: QueueHandle<State>) -> Result<Self, String> {
        let registry_state = RegistryState::new(globals);
        let output_state = OutputState::new(globals, &qh);
        let compositor_state =
            CompositorState::bind(globals, &qh).map_err(|err| format!("wl_compositor: {err}"))?;
        let layer_shell =
            LayerShell::bind(globals, &qh).map_err(|err| format!("wlr-layer-shell: {err}"))?;
        let shm = Shm::bind(globals, &qh).map_err(|err| format!("wl_shm: {err}"))?;

        Ok(Self {
            registry_state,
            output_state,
            compositor_state,
            layer_shell,
            shm,
            qh,
            surfaces: HashMap::new(),
            frames: 0,
            uploads: 0,
            fps_since: std::time::Instant::now(),
        })
    }

    fn sample_fps(&mut self) {
        self.frames += 1;
        let elapsed = self.fps_since.elapsed();
        if elapsed.as_secs() >= 1 {
            let seconds = elapsed.as_secs_f64();
            let fps = self.frames as f64 / seconds;
            let uploads = self.uploads as f64 / seconds;
            log::info!("present rate: {fps:.0} fps ({uploads:.0} uploads/s)");
            self.frames = 0;
            self.uploads = 0;
            self.fps_since = std::time::Instant::now();
        }
    }

    pub fn handle_command(&mut self, command: Command) {
        match command {
            Command::Create {
                role,
                url,
                monitor,
                layer,
                anchors,
                width,
                height,
                keyboard,
                exclusive_edge,
                exclusive_size,
            } => {
                let spec = SurfaceSpec {
                    role,
                    url,
                    monitor,
                    layer,
                    anchors,
                    width,
                    height,
                    keyboard,
                    exclusive_edge,
                    exclusive_size,
                };
                self.create_surface(spec);
            }
            Command::Exclusive { role, size, .. } => {
                if let Some(surface) = self.surfaces.get(&role) {
                    surface.layer.set_exclusive_zone(size);
                    surface.layer.commit();
                }
            }
            Command::Region { role, rects } => self.set_input_region(&role, &rects),
            Command::Show { role } => log::info!("show {role} (stage: map/unmap TODO)"),
            Command::Hide { role } => log::info!("hide {role} (stage: map/unmap TODO)"),
            Command::Destroy { role } => {
                self.surfaces.remove(&role);
            }
        }
    }

    fn create_surface(&mut self, spec: SurfaceSpec) {
        let wl_surface = self.compositor_state.create_surface(&self.qh);
        let output = self.find_output(&spec.monitor);

        // Per-role namespace so the compositor can target it, e.g.
        // `layerrule = blur, neobar.bar`.
        let namespace = format!("neobar.{}", spec.role);
        let layer = self.layer_shell.create_layer_surface(
            &self.qh,
            wl_surface,
            to_sctk_layer(spec.layer),
            Some(namespace),
            output.as_ref(),
        );

        layer.set_anchor(to_sctk_anchor(&spec.anchors));
        layer.set_keyboard_interactivity(to_sctk_keyboard(spec.keyboard));

        if let Some(edge) = spec.exclusive_edge {
            layer.set_exclusive_zone(spec.exclusive_size);
            match edge {
                Edge::Top | Edge::Bottom => layer.set_size(0, spec.exclusive_size as u32),
                Edge::Left | Edge::Right => layer.set_size(spec.exclusive_size as u32, 0),
            }
        } else if spec.width > 0 || spec.height > 0 {
            layer.set_size(spec.width.max(0) as u32, spec.height.max(0) as u32);
        }

        // Provisional view size; resized on the first configure.
        let view_width = spec.width.max(1);
        let view_height = spec.height.max(1);
        let view = match CefView::new(&spec.url, view_width, view_height) {
            Some(view) => view,
            None => {
                log::error!("create CEF view {} failed", spec.role);
                return;
            }
        };

        layer.commit();
        let managed = ManagedSurface::new(spec.role.clone(), layer, view);
        self.surfaces.insert(spec.role, managed);
    }

    /// Restrict a surface's input to `rects`; everything outside is click-through.
    /// Empty rects = whole surface click-through.
    fn set_input_region(&mut self, role: &str, rects: &[Rect]) {
        let Some(managed) = self.surfaces.get(role) else {
            return;
        };

        let region = match Region::new(&self.compositor_state) {
            Ok(region) => region,
            Err(err) => {
                log::error!("create region {role}: {err}");
                return;
            }
        };
        for rect in rects {
            region.add(rect.x, rect.y, rect.w, rect.h);
        }
        managed.layer.set_input_region(Some(region.wl_region()));
        managed.layer.commit();
    }

    fn find_output(&self, connector: &str) -> Option<wl_output::WlOutput> {
        if connector.is_empty() {
            return None;
        }
        for output in self.output_state.outputs() {
            let info = self.output_state.info(&output);
            if info.and_then(|info| info.name) == Some(connector.to_string()) {
                return Some(output);
            }
        }
        log::warn!("output {connector:?} not found, using default");
        None
    }

    fn present(&mut self, wl_surface: &wl_surface::WlSurface) {
        self.sample_fps();
        let uploaded = {
            let Self {
                shm, surfaces, qh, ..
            } = self;
            let found = surfaces
                .values_mut()
                .find(|surface| surface.layer.wl_surface() == wl_surface);
            match found {
                Some(surface) => surface.present(shm, qh),
                None => false,
            }
        };
        if uploaded {
            self.uploads += 1;
        }
    }
}

impl CompositorHandler for State {
    fn scale_factor_changed(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _surface: &wl_surface::WlSurface,
        _new_factor: i32,
    ) {
    }

    fn transform_changed(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _surface: &wl_surface::WlSurface,
        _new_transform: wl_output::Transform,
    ) {
    }

    fn frame(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        surface: &wl_surface::WlSurface,
        _time: u32,
    ) {
        self.present(surface);
    }

    fn surface_enter(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _surface: &wl_surface::WlSurface,
        _output: &wl_output::WlOutput,
    ) {
    }

    fn surface_leave(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _surface: &wl_surface::WlSurface,
        _output: &wl_output::WlOutput,
    ) {
    }
}

impl LayerShellHandler for State {
    fn closed(&mut self, _conn: &Connection, _qh: &QueueHandle<Self>, layer: &LayerSurface) {
        let wl_surface = layer.wl_surface().clone();
        self.surfaces
            .retain(|_, surface| surface.layer.wl_surface() != &wl_surface);
    }

    fn configure(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        layer: &LayerSurface,
        configure: LayerSurfaceConfigure,
        _serial: u32,
    ) {
        let target = layer.wl_surface().clone();
        let (width, height) = configure.new_size;

        let Self {
            shm, surfaces, qh, ..
        } = self;
        let found = surfaces
            .values_mut()
            .find(|surface| surface.layer.wl_surface() == &target);
        if let Some(surface) = found {
            surface.configure(width, height);
            surface.present(shm, qh);
        }
    }
}

impl OutputHandler for State {
    fn output_state(&mut self) -> &mut OutputState {
        &mut self.output_state
    }

    fn new_output(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _output: wl_output::WlOutput,
    ) {
    }

    fn update_output(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _output: wl_output::WlOutput,
    ) {
    }

    fn output_destroyed(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _output: wl_output::WlOutput,
    ) {
    }
}

impl ShmHandler for State {
    fn shm_state(&mut self) -> &mut Shm {
        &mut self.shm
    }
}

impl ProvidesRegistryState for State {
    fn registry(&mut self) -> &mut RegistryState {
        &mut self.registry_state
    }
    registry_handlers![OutputState];
}

delegate_compositor!(State);
delegate_output!(State);
delegate_shm!(State);
delegate_layer!(State);
delegate_registry!(State);
