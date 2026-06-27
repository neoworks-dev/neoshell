//! Wayland connection, wlr-layer-shell, and seat/input plumbing.
//!
//! STAGE 2 target: bring up a connection, bind `zwlr_layer_shell_v1` and
//! `zwp_linux_dmabuf_v1`, and create one layer surface that can receive a dmabuf
//! `wl_buffer`. STAGE 4 adds `wl_seat` (pointer/keyboard/touch).
//!
//! Use smithay-client-toolkit's `LayerShell` + `registry_handlers!` rather than
//! hand-rolling the protocol glue. The event loop is calloop, shared with the
//! control socket (insert the `UnixStream` as a calloop source) so commands and
//! frame callbacks are serviced together.

// TODO(stage 2): implement.
//
// Sketch:
//   pub struct Connection { /* wl globals, layer_shell, dmabuf, qh, loop */ }
//   impl Connection {
//       pub fn new() -> anyhow::Result<Self> { ... }
//       pub fn create_layer_surface(&mut self, spec: &SurfaceSpec) -> LayerSurface { ... }
//       pub fn run(&mut self) -> ! { /* calloop dispatch */ }
//   }
//
// The frame callback is where `external_begin_frame` is driven so Ultralight
// renders in lockstep with the compositor's vsync — this is what keeps it smooth.
