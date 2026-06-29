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
WPEDisplay* neoshell_display_new(const char* drm_primary_node,
                               const char* drm_render_node,
                               int width, int height, int refresh_mhz);

// Install the per-frame delivery callback.
void neoshell_display_set_render_callback(WPEDisplay* display, RenderCallback cb);

// Called when WebKit requests a named cursor for a view (CSS cursor name, e.g.
// "pointer", "grab", "text"). The host applies it to the Wayland seat pointer.
using CursorCallback = std::function<void(WPEView* view, const char* name)>;
void neoshell_display_set_cursor_callback(WPEDisplay* display, CursorCallback cb);

// Fire one vblank: ticks the screen's sync observer so WPE advances a frame.
// Returns true if the observer was active (WebKit wanted frames). One shared
// observer drives all views; idle views produce no frames, so this is cheap.
bool neoshell_display_tick_vblank(WPEDisplay* display);

// True while WebKit wants to render (it started the sync observer). Used to keep
// ticking — so input-driven repaints (e.g. CSS :hover) render promptly — without
// ticking when the page is fully idle.
bool neoshell_display_observer_active(WPEDisplay* display);
