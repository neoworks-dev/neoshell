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

use smithay_client_toolkit::compositor::{CompositorHandler, CompositorState, Region};
use smithay_client_toolkit::output::{OutputHandler, OutputState};
use smithay_client_toolkit::registry::{ProvidesRegistryState, RegistryState};
use smithay_client_toolkit::seat::keyboard::{
    KeyEvent as SctkKeyEvent, KeyboardHandler, Keysym, Modifiers,
};
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
use ul_next::event::{KeyEventCreationInfo, KeyEventType, MouseButton, MouseEventType};
use ul_next::key_code::VirtualKeyCode;
use wayland_client::globals::GlobalList;
use wayland_client::protocol::{wl_keyboard, wl_output, wl_pointer, wl_seat, wl_surface};
use wayland_client::{Connection, QueueHandle};

use crate::input;
use crate::protocol::{Command, Edge, Rect};
use crate::surface::{
    to_sctk_anchor, to_sctk_keyboard, to_sctk_layer, ManagedSurface, SurfaceSpec,
};
use crate::ultralight::{Renderer, View};

pub struct State {
    registry_state: RegistryState,
    output_state: OutputState,
    compositor_state: CompositorState,
    layer_shell: LayerShell,
    shm: Shm,
    qh: QueueHandle<State>,

    renderer: Renderer,
    surfaces: HashMap<String, ManagedSurface>,

    seat_state: SeatState,
    pointer: Option<wl_pointer::WlPointer>,
    keyboard: Option<wl_keyboard::WlKeyboard>,
    pointer_focus: Option<wl_surface::WlSurface>,
    pointer_pos: (i32, i32),
    keyboard_focus: Option<wl_surface::WlSurface>,
    modifiers: Modifiers,

    // Objective present-rate sampling (displayed frames/sec).
    frames: u32,
    fps_since: std::time::Instant,
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
        let seat_state = SeatState::new(globals, &qh);

        Ok(Self {
            registry_state,
            output_state,
            compositor_state,
            layer_shell,
            shm,
            qh,
            renderer,
            surfaces: HashMap::new(),
            seat_state,
            pointer: None,
            keyboard: None,
            pointer_focus: None,
            pointer_pos: (0, 0),
            keyboard_focus: None,
            modifiers: Modifiers::default(),
            frames: 0,
            fps_since: std::time::Instant::now(),
        })
    }

    /// The Ultralight view backing a given wl_surface, if any.
    fn view_for(&self, surface: &wl_surface::WlSurface) -> Option<&View> {
        self.surfaces
            .values()
            .find(|managed| managed.layer.wl_surface() == surface)
            .map(|managed| &managed.view)
    }

    fn fire_mouse_move(&self, surface: &wl_surface::WlSurface, position: (i32, i32)) {
        if let Some(view) = self.view_for(surface) {
            view.fire_mouse(MouseEventType::MouseMoved, position.0, position.1, MouseButton::None);
        }
    }

    fn fire_mouse_button(
        &self,
        surface: &wl_surface::WlSurface,
        position: (i32, i32),
        button: u32,
        ty: MouseEventType,
    ) {
        if let Some(view) = self.view_for(surface) {
            view.fire_mouse(ty, position.0, position.1, input::map_button(button));
        }
    }

    /// Fire a keyboard event to the focused view: a RawKeyDown/KeyUp with the
    /// mapped virtual key, plus a Char event carrying the utf8 text on key down.
    fn fire_key(&self, event: SctkKeyEvent, ty: KeyEventType) {
        let Some(surface) = self.keyboard_focus.as_ref() else {
            return;
        };
        let Some(view) = self.view_for(surface) else {
            return;
        };

        view.fire_key(KeyEventCreationInfo {
            ty,
            modifiers: input::to_ul_modifiers(self.modifiers),
            virtual_key_code: input::map_keysym(event.keysym),
            native_key_code: event.raw_code as i32,
            text: "",
            unmodified_text: "",
            is_keypad: false,
            is_auto_repeat: false,
            is_system_key: false,
        });

        if !matches!(ty, KeyEventType::RawKeyDown) {
            return;
        }
        let Some(utf8) = event.utf8.as_deref() else {
            return;
        };
        if !input::is_text(utf8) {
            return;
        }
        view.fire_key(KeyEventCreationInfo {
            ty: KeyEventType::Char,
            modifiers: input::to_ul_modifiers(self.modifiers),
            virtual_key_code: VirtualKeyCode::Unknown,
            native_key_code: 0,
            text: utf8,
            unmodified_text: utf8,
            is_keypad: false,
            is_auto_repeat: false,
            is_system_key: false,
        });
    }

    fn sample_fps(&mut self) {
        self.frames += 1;
        let elapsed = self.fps_since.elapsed();
        if elapsed.as_secs() >= 1 {
            let fps = self.frames as f64 / elapsed.as_secs_f64();
            log::info!("present rate: {fps:.0} fps");
            self.frames = 0;
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
        } else if spec.width > 0 || spec.height > 0 {
            // An explicitly sized surface (e.g. a centered panel).
            layer.set_size(spec.width.max(0) as u32, spec.height.max(0) as u32);
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

    /// Restrict a surface's input to `rects`; everything outside is click-through.
    /// Empty rects = an empty region = the whole surface is click-through. This
    /// fits a mostly-transparent overlay where the frontend carves out the few
    /// interactive areas (the default, before any region command, is the whole
    /// surface — so send an empty region to release a fullscreen overlay).
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
        // Drive animations (RAF/CSS) off the display refresh, then advance and
        // paint, then present the matching surface.
        self.renderer.refresh_display(0);
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
            let position = (event.position.0 as i32, event.position.1 as i32);
            match event.kind {
                PointerEventKind::Enter { .. } => {
                    self.pointer_focus = Some(event.surface.clone());
                    self.pointer_pos = position;
                    self.fire_mouse_move(&event.surface, position);
                }
                PointerEventKind::Leave { .. } => {
                    if self.pointer_focus.as_ref() == Some(&event.surface) {
                        self.pointer_focus = None;
                    }
                }
                PointerEventKind::Motion { .. } => {
                    self.pointer_pos = position;
                    self.fire_mouse_move(&event.surface, position);
                }
                PointerEventKind::Press { button, .. } => {
                    self.pointer_pos = position;
                    self.fire_mouse_button(&event.surface, position, button, MouseEventType::MouseDown);
                }
                PointerEventKind::Release { button, .. } => {
                    self.fire_mouse_button(&event.surface, position, button, MouseEventType::MouseUp);
                }
                PointerEventKind::Axis {
                    horizontal,
                    vertical,
                    ..
                } => {
                    // Wayland axis is positive down/right; Ultralight scroll
                    // delta is the content offset, so invert.
                    let delta_x = -horizontal.absolute as i32;
                    let delta_y = -vertical.absolute as i32;
                    if let Some(view) = self.view_for(&event.surface) {
                        view.fire_scroll(delta_x, delta_y);
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
        self.fire_key(event, KeyEventType::RawKeyDown);
    }

    fn release_key(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _keyboard: &wl_keyboard::WlKeyboard,
        _serial: u32,
        event: SctkKeyEvent,
    ) {
        self.fire_key(event, KeyEventType::KeyUp);
    }

    fn update_modifiers(
        &mut self,
        _conn: &Connection,
        _qh: &QueueHandle<Self>,
        _keyboard: &wl_keyboard::WlKeyboard,
        _serial: u32,
        modifiers: Modifiers,
        _layout: u32,
    ) {
        self.modifiers = modifiers;
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
