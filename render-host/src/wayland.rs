//! Wayland connection state, wlr-layer-shell, wl_shm, and command handling.
//!
//! `State` owns the live surfaces and implements the smithay-client-toolkit
//! handler traits. CEF paints into each view's shared frame buffer on the pump
//! timer; the Wayland frame callback presents the latest frame via wl_shm.
//!
//! Render-only for C2/C3. Seat/input handling is added in C4.

use std::collections::HashMap;

use cef::KeyEventType;
use smithay_client_toolkit::compositor::{CompositorHandler, CompositorState, Region};
use smithay_client_toolkit::output::{OutputHandler, OutputState};
use smithay_client_toolkit::registry::{ProvidesRegistryState, RegistryState};
use smithay_client_toolkit::seat::keyboard::{KeyEvent as SctkKeyEvent, KeyboardHandler, Keysym};
use smithay_client_toolkit::seat::pointer::{PointerEvent, PointerEventKind, PointerHandler};
use smithay_client_toolkit::seat::{Capability, SeatHandler, SeatState};
use smithay_client_toolkit::shell::wlr_layer::{
    LayerShell, LayerShellHandler, LayerSurface, LayerSurfaceConfigure,
};
use smithay_client_toolkit::shell::WaylandSurface;
use smithay_client_toolkit::shm::{Shm, ShmHandler};
use smithay_client_toolkit::{
    delegate_compositor, delegate_keyboard, delegate_layer, delegate_output, delegate_pointer,
    delegate_registry, delegate_seat, delegate_shm, registry_handlers,
};
use wayland_client::globals::GlobalList;
use wayland_client::protocol::{wl_keyboard, wl_output, wl_pointer, wl_seat, wl_surface};
use wayland_client::{Connection, QueueHandle};

use crate::cef_engine::CefView;
use crate::input;
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

    seat_state: SeatState,
    pointer: Option<wl_pointer::WlPointer>,
    keyboard: Option<wl_keyboard::WlKeyboard>,
    pointer_focus: Option<wl_surface::WlSurface>,
    keyboard_focus: Option<wl_surface::WlSurface>,

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
        let seat_state = SeatState::new(globals, &qh);

        Ok(Self {
            registry_state,
            output_state,
            compositor_state,
            layer_shell,
            shm,
            qh,
            surfaces: HashMap::new(),
            seat_state,
            pointer: None,
            keyboard: None,
            pointer_focus: None,
            keyboard_focus: None,
            frames: 0,
            uploads: 0,
            fps_since: std::time::Instant::now(),
        })
    }

    /// The CEF view backing a given wl_surface, if any.
    fn view_for(&self, surface: &wl_surface::WlSurface) -> Option<&CefView> {
        self.surfaces
            .values()
            .find(|managed| managed.layer.wl_surface() == surface)
            .map(|managed| &managed.view)
    }

    /// Fire a keyboard event to the focused view: a RawKeyDown/KeyUp with the
    /// mapped virtual key, plus Char events for the utf8 text on key down.
    fn fire_key(&self, event: SctkKeyEvent, is_down: bool) {
        let Some(surface) = self.keyboard_focus.as_ref() else {
            return;
        };
        let Some(view) = self.view_for(surface) else {
            return;
        };
        let type_ = if is_down {
            KeyEventType::RAWKEYDOWN
        } else {
            KeyEventType::KEYUP
        };
        view.send_key(type_, input::windows_key_code(event.keysym));

        if is_down {
            if let Some(utf8) = event.utf8.as_deref() {
                if input::is_text(utf8) {
                    view.send_text(utf8);
                }
            }
        }
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
                if let Some(surface) = self.surfaces.remove(&role) {
                    surface.view.close();
                }
            }
        }
    }

    fn create_surface(&mut self, spec: SurfaceSpec) {
        let wl_surface = self.compositor_state.create_surface(&self.qh);
        // Fall back to the first output so we can read its size even when no
        // monitor was named; sizing below needs a concrete output.
        let output = self
            .find_output(&spec.monitor)
            .or_else(|| self.output_state.outputs().next());

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
        } else {
            let (width, height) = self.resolve_size(&spec, output.as_ref());
            if width > 0 || height > 0 {
                layer.set_size(width, height);
            }
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

    /// Resolve the explicit surface size. A zero dimension is only legal when the
    /// surface is anchored to both opposing edges (the compositor then fills it);
    /// otherwise we fill it from the output. This lets a bar anchored to top+left+
    /// right declare a real height so it can reserve an exclusive zone — a surface
    /// anchored to all four edges has its exclusive zone ignored by wlroots.
    fn resolve_size(&self, spec: &SurfaceSpec, output: Option<&wl_output::WlOutput>) -> (u32, u32) {
        let mut width = spec.width.max(0) as u32;
        let mut height = spec.height.max(0) as u32;

        let spans_horizontally =
            spec.anchors.contains(&Edge::Left) && spec.anchors.contains(&Edge::Right);
        let spans_vertically =
            spec.anchors.contains(&Edge::Top) && spec.anchors.contains(&Edge::Bottom);
        let needs_width = width == 0 && !spans_horizontally;
        let needs_height = height == 0 && !spans_vertically;
        if !needs_width && !needs_height {
            return (width, height);
        }

        if let Some((output_width, output_height)) =
            output.and_then(|output| self.output_logical_size(output))
        {
            if needs_width {
                width = output_width as u32;
            }
            if needs_height {
                height = output_height as u32;
            }
        }
        (width, height)
    }

    /// Output size in layer-shell (logical) coordinates, falling back to the
    /// current mode's pixel dimensions when the logical size is not advertised.
    fn output_logical_size(&self, output: &wl_output::WlOutput) -> Option<(i32, i32)> {
        let info = self.output_state.info(output)?;
        if let Some(size) = info.logical_size {
            return Some(size);
        }
        info.modes
            .iter()
            .find(|mode| mode.current)
            .map(|mode| mode.dimensions)
    }

    /// Drive surfaces whose frame-callback loop has stopped (idle). Called from
    /// the pump timer so a new CEF paint resumes presenting even though the
    /// compositor is no longer sending frame callbacks for that surface.
    pub fn drive_idle_surfaces(&mut self) {
        let Self {
            shm, surfaces, qh, ..
        } = self;
        for surface in surfaces.values_mut() {
            if surface.needs_idle_drive() {
                surface.idle_probe(shm, qh);
            }
        }
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
    registry_handlers![OutputState, SeatState];
}

impl SeatHandler for State {
    fn seat_state(&mut self) -> &mut SeatState {
        &mut self.seat_state
    }

    fn new_seat(&mut self, _conn: &Connection, _qh: &QueueHandle<Self>, _seat: wl_seat::WlSeat) {}

    fn new_capability(
        &mut self,
        _conn: &Connection,
        qh: &QueueHandle<Self>,
        seat: wl_seat::WlSeat,
        capability: Capability,
    ) {
        if capability == Capability::Pointer && self.pointer.is_none() {
            match self.seat_state.get_pointer(qh, &seat) {
                Ok(pointer) => self.pointer = Some(pointer),
                Err(err) => log::warn!("get_pointer: {err}"),
            }
        }
        if capability == Capability::Keyboard && self.keyboard.is_none() {
            match self.seat_state.get_keyboard::<State, State>(qh, &seat, None) {
                Ok(keyboard) => self.keyboard = Some(keyboard),
                Err(err) => log::warn!("get_keyboard: {err}"),
            }
        }
    }

    fn remove_capability(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _seat: wl_seat::WlSeat,
        capability: Capability,
    ) {
        match capability {
            Capability::Pointer => self.pointer = None,
            Capability::Keyboard => {
                self.keyboard = None;
                self.keyboard_focus = None;
            }
            _ => {}
        }
    }

    fn remove_seat(&mut self, _conn: &Connection, _qh: &QueueHandle<Self>, _seat: wl_seat::WlSeat) {}
}

impl PointerHandler for State {
    fn pointer_frame(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _pointer: &wl_pointer::WlPointer,
        events: &[PointerEvent],
    ) {
        for event in events {
            let (x, y) = (event.position.0 as i32, event.position.1 as i32);
            match event.kind {
                PointerEventKind::Enter { .. } => {
                    self.pointer_focus = Some(event.surface.clone());
                    if let Some(view) = self.view_for(&event.surface) {
                        view.send_mouse_move(x, y, false);
                    }
                }
                PointerEventKind::Leave { .. } => {
                    if let Some(view) = self.view_for(&event.surface) {
                        view.send_mouse_move(x, y, true);
                    }
                    if self.pointer_focus.as_ref() == Some(&event.surface) {
                        self.pointer_focus = None;
                    }
                }
                PointerEventKind::Motion { .. } => {
                    if let Some(view) = self.view_for(&event.surface) {
                        view.send_mouse_move(x, y, false);
                    }
                }
                PointerEventKind::Press { button, .. } => {
                    if let (Some(mapped), Some(view)) =
                        (input::map_button(button), self.view_for(&event.surface))
                    {
                        view.send_mouse_button(x, y, mapped, false);
                    }
                }
                PointerEventKind::Release { button, .. } => {
                    if let (Some(mapped), Some(view)) =
                        (input::map_button(button), self.view_for(&event.surface))
                    {
                        view.send_mouse_button(x, y, mapped, true);
                    }
                }
                PointerEventKind::Axis {
                    horizontal,
                    vertical,
                    ..
                } => {
                    // Wayland axis is positive down/right; CEF wheel delta is the
                    // opposite sense, so invert.
                    let delta_x = -horizontal.absolute as i32;
                    let delta_y = -vertical.absolute as i32;
                    if let Some(view) = self.view_for(&event.surface) {
                        view.send_scroll(x, y, delta_x, delta_y);
                    }
                }
            }
        }
    }
}

impl KeyboardHandler for State {
    fn enter(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _keyboard: &wl_keyboard::WlKeyboard,
        surface: &wl_surface::WlSurface,
        _serial: u32,
        _raw: &[u32],
        _keysyms: &[Keysym],
    ) {
        self.keyboard_focus = Some(surface.clone());
    }

    fn leave(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _keyboard: &wl_keyboard::WlKeyboard,
        surface: &wl_surface::WlSurface,
        _serial: u32,
    ) {
        if self.keyboard_focus.as_ref() == Some(surface) {
            self.keyboard_focus = None;
        }
    }

    fn press_key(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _keyboard: &wl_keyboard::WlKeyboard,
        _serial: u32,
        event: SctkKeyEvent,
    ) {
        self.fire_key(event, true);
    }

    fn release_key(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _keyboard: &wl_keyboard::WlKeyboard,
        _serial: u32,
        event: SctkKeyEvent,
    ) {
        self.fire_key(event, false);
    }

    fn update_modifiers(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _keyboard: &wl_keyboard::WlKeyboard,
        _serial: u32,
        _modifiers: smithay_client_toolkit::seat::keyboard::Modifiers,
        _layout: u32,
    ) {
    }
}

delegate_compositor!(State);
delegate_output!(State);
delegate_shm!(State);
delegate_layer!(State);
delegate_registry!(State);
delegate_seat!(State);
delegate_pointer!(State);
delegate_keyboard!(State);
