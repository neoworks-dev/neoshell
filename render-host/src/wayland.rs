//! Wayland connection state, wlr-layer-shell, wl_shm, and command handling.
//!
//! `State` owns the Ultralight renderer and the live surfaces, and implements the
//! smithay-client-toolkit handler traits. Rendering is frame-callback driven: a
//! surface's `present` requests the next `wl_surface.frame`, and `CompositorHandler::frame`
//! drives the next paint, so we render in lockstep with the compositor's vsync.
//!
//! Stage 2 scope: create surfaces, present Ultralight's CPU bitmap via wl_shm.
//! Seat/input (stage 4) and the GPU/dmabuf path (stage 3.5) are not here yet.

use std::collections::HashMap;

use smithay_client_toolkit::compositor::{CompositorHandler, CompositorState};
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

use crate::protocol::{Command, Edge};
use crate::surface::{
    to_sctk_anchor, to_sctk_keyboard, to_sctk_layer, ManagedSurface, SurfaceSpec,
};
use crate::ultralight::Renderer;

pub struct State {
    registry_state: RegistryState,
    output_state: OutputState,
    compositor_state: CompositorState,
    layer_shell: LayerShell,
    shm: Shm,
    qh: QueueHandle<State>,

    renderer: Renderer,
    surfaces: HashMap<String, ManagedSurface>,
}

impl State {
    pub fn new(
        globals: &GlobalList,
        qh: QueueHandle<State>,
        renderer: Renderer,
    ) -> Result<Self, String> {
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
            renderer,
            surfaces: HashMap::new(),
        })
    }

    pub fn handle_command(&mut self, command: Command) {
        match command {
            Command::Create {
                role,
                url,
                monitor,
                layer,
                anchors,
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
            Command::Region { role, rects } => {
                // TODO(stage 4): build a wl_region from rects and
                // wl_surface.set_input_region. Empty rects = whole surface.
                log::info!("region {role}: {} rects (stage 4)", rects.len());
            }
            Command::Show { role } => {
                log::info!("show {role} (stage 4 — map/unmap)");
            }
            Command::Hide { role } => {
                log::info!("hide {role} (stage 4 — map/unmap)");
            }
            Command::Destroy { role } => {
                self.surfaces.remove(&role);
            }
        }
    }

    fn create_surface(&mut self, spec: SurfaceSpec) {
        let wl_surface = self.compositor_state.create_surface(&self.qh);
        let output = self.find_output(&spec.monitor);

        // Per-role namespace so the compositor can target it, e.g.
        // `layerrule = blur, neobar.bar`. Hyprland matches namespaces by regex,
        // so `neobar.*` blurs every shell surface.
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
            // A bar stretches along its anchored edges and needs an explicit
            // thickness on the perpendicular axis (0 = stretch on that axis).
            match edge {
                Edge::Top | Edge::Bottom => layer.set_size(0, spec.exclusive_size as u32),
                Edge::Left | Edge::Right => layer.set_size(spec.exclusive_size as u32, 0),
            }
        }

        // Provisional view size; resized on the first configure when the
        // compositor tells us the real dimensions.
        let view = match self.renderer.create_view(1, 1) {
            Ok(view) => view,
            Err(err) => {
                log::error!("create view {}: {err}", spec.role);
                return;
            }
        };
        // `html:` prefix loads inline HTML (test affordance); otherwise a URL.
        let load_result = match spec.url.strip_prefix("html:") {
            Some(html) => view.load_html(html),
            None => view.load_url(&spec.url),
        };
        if let Err(err) = load_result {
            log::error!("{err}");
        }

        layer.commit();
        let managed = ManagedSurface::new(spec.role.clone(), layer, view);
        self.surfaces.insert(spec.role, managed);
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
        // Advance Ultralight once, then present the matching surface.
        self.renderer.update();
        self.renderer.render();
        let Self {
            shm,
            surfaces,
            qh,
            ..
        } = self;
        let found = surfaces
            .values_mut()
            .find(|surface| surface.layer.wl_surface() == wl_surface);
        if let Some(surface) = found {
            surface.present(shm, qh);
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

        // First configure also kicks off the render loop with an initial present.
        self.renderer.update();
        self.renderer.render();
        let Self {
            shm,
            surfaces,
            qh,
            ..
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
