// Minimal wlr-layer-shell present path: takes a WPE dmabuf, imports it via
// zwp_linux_dmabuf, attaches to a layer surface, and ticks a vblank callback
// from the surface's frame callback (the compositor's real refresh).
#pragma once

#include <wpe/wpe-platform.h>
#include <functional>

struct WaylandPresent;

WaylandPresent* wayland_present_new(int width, int height);

// Called once per frame callback (vblank) so the host can tick WPE.
void wayland_present_set_vblank_callback(WaylandPresent*, std::function<void()>);

// True once the layer surface is configured and ready for buffers.
bool wayland_present_ready(WaylandPresent*);

// Import + attach + commit a WPE dmabuf. on_release runs when the compositor
// releases the wl_buffer (frame is safe to reuse).
void wayland_present_submit(WaylandPresent*, WPEBufferDMABuf*,
                            std::function<void()> on_release);

// Wayland fd + pump helpers for GLib integration.
int  wayland_present_fd(WaylandPresent*);
void wayland_present_dispatch(WaylandPresent*);
void wayland_present_flush(WaylandPresent*);
