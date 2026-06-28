// Custom WPEPlatform backend: a headless-style off-screen display whose single
// screen's sync observer is driven externally (by us), and whose view delivers
// each rendered frame to a host callback as a WPEBuffer (DMABuf).
//
// This is the load-bearing piece of the WPE migration: it lets WPE render
// off-screen at a refresh rate WE control, and hands us the GPU buffer to
// composite onto a wlr-layer-shell surface.
#pragma once

#include <wpe/wpe-platform.h>
#include <functional>

// Called from WPEView::render_buffer when WPE has a new frame. The host must
// eventually call wpe_view_buffer_rendered(view, buffer) (present done) and
// wpe_view_buffer_released(view, buffer) (buffer reusable).
using RenderCallback =
    std::function<void(WPEView* view, WPEBuffer* buffer,
                       const WPERectangle* damage, guint n_damage)>;

// Create the custom display. drm_render_node e.g. "/dev/dri/renderD128",
// drm_primary_node e.g. "/dev/dri/card1". width/height/refresh seed the screen.
WPEDisplay* neobar_display_new(const char* drm_primary_node,
                               const char* drm_render_node,
                               int width, int height, int refresh_mhz);

// Install the per-frame delivery callback.
void neobar_display_set_render_callback(WPEDisplay* display, RenderCallback cb);

// Fire one vblank: ticks the screen's sync observer so WPE advances a frame.
// Returns true if the observer was active (WebKit wanted frames). One shared
// observer drives all views; idle views produce no frames, so this is cheap.
bool neobar_display_tick_vblank(WPEDisplay* display);
