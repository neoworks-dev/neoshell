// Shared Wayland connection + N layer-shell surfaces. Each Surface owns one
// wlr-layer-shell surface, imports WPE dmabufs zero-copy, and drives a vblank
// callback from its own frame callback. Mirrors the Rust render-host's
// surface.rs / wayland.rs behavior (roles, layers, anchors, exclusive zones,
// input regions, monitor placement).
#pragma once

#include <wpe/wpe-platform.h>
#include <cstdint>
#include <functional>
#include <string>
#include <vector>

struct wl_display;
struct wl_output;
struct wl_surface;
struct WaylandConn;
struct Surface;

// Edge / layer / keyboard match the control protocol enum ordering.
enum Anchor : uint32_t { ANCHOR_TOP = 1, ANCHOR_BOTTOM = 2, ANCHOR_LEFT = 4, ANCHOR_RIGHT = 8 };
enum LayerKind { LAYER_BACKGROUND = 0, LAYER_BOTTOM, LAYER_TOP, LAYER_OVERLAY };
enum KeyboardMode { KB_NONE = 0, KB_ONDEMAND, KB_EXCLUSIVE };
enum EdgeKind { EDGE_NONE = -1, EDGE_TOP = 0, EDGE_BOTTOM, EDGE_LEFT, EDGE_RIGHT };
// Portable keyboard modifier bitmask emitted with each key event, so the WPE
// layer (main.cpp) can map it to WPEModifiers without present.cpp knowing WPE.
enum KeyMod : uint32_t {
    MOD_CTRL = 1 << 0,
    MOD_SHIFT = 1 << 1,
    MOD_ALT = 1 << 2,
    MOD_META = 1 << 3,
    MOD_CAPS = 1 << 4,
};

struct Rect { int x, y, w, h; };

struct SurfaceSpec {
    std::string role;
    std::string monitor;     // wl_output name; empty = first output
    LayerKind layer = LAYER_TOP;
    uint32_t anchors = 0;    // bitmask of Anchor
    int width = 0, height = 0;
    KeyboardMode keyboard = KB_NONE;
    EdgeKind exclusive_edge = EDGE_NONE;
    int exclusive_size = 0;
};

// Raw seat input, routed to the focused surface's wl_surface. The host maps the
// wl_surface to its WPE view and builds the WPEEvent. Coords are surface-local.
struct InputSink {
    std::function<void(wl_surface*, double x, double y)> pointer_enter;
    std::function<void(wl_surface*, double x, double y)> pointer_leave;
    std::function<void(wl_surface*, double x, double y)> pointer_motion;
    std::function<void(wl_surface*, double x, double y, uint32_t button, bool pressed)> pointer_button;
    std::function<void(wl_surface*, double x, double y, double dx, double dy)> pointer_axis;
    std::function<void(wl_surface*, uint32_t keycode, uint32_t keysym, uint32_t modifiers, bool pressed)> key;
    // Keyboard focus enter/leave, so the host can focus/unfocus the WPE view
    // (WebKit only shows the text caret and full input state for a focused view).
    std::function<void(wl_surface*, bool focused)> keyboard_focus;
    // A file drag-and-drop landed on a surface. Paths are absolute filesystem
    // paths decoded from the drop's text/uri-list. Handled natively (WPE's
    // off-screen backend has no DOM drag path), forwarded to the core.
    std::function<void(wl_surface*, double x, double y, const std::vector<std::string>& paths)> drop;
    // A file drag entered/left a surface's input region (fired only for drags
    // carrying files), so the surface can react before the drop — e.g. the notch
    // expanding as a drag approaches.
    std::function<void(wl_surface*, double x, double y)> drag_enter;
    std::function<void(wl_surface*, double x, double y)> drag_motion;
    std::function<void(wl_surface*)> drag_leave;
};

// ---- connection ----
WaylandConn* conn_new();
void conn_set_input(WaylandConn*, InputSink);

// Register a callback fired whenever an output is added, removed, or changes mode,
// so the host can re-run its per-output checks (e.g. refresh-rate seeding).
void conn_set_outputs_changed_cb(WaylandConn*, std::function<void()>);
int  conn_fd(WaylandConn*);
void conn_dispatch(WaylandConn*);   // non-blocking read + dispatch + flush
void conn_flush(WaylandConn*);
bool conn_ok(WaylandConn*);
// The compositor's render GPU (from dmabuf-feedback main_device). All surfaces
// must render here regardless of which output they're on — the compositor
// composites on this GPU and scans out to other GPUs' connectors. Empty if
// undetected (caller falls back to env/default).
const char* conn_render_node(WaylandConn*);
const char* conn_primary_node(WaylandConn*);

// Current mode (pixels + refresh in mHz) of the named output, or the first output
// when name is empty/NULL. Returns false if no output or no known refresh.
bool conn_output_mode(WaylandConn*, const char* name, int* w, int* h, int* refresh);

// Apply a named cursor (CSS cursor name, e.g. "pointer", "grab", "text") to the
// seat pointer, from a wl_cursor theme. Driven by WebKit's set_cursor_from_name.
void present_set_cursor(WaylandConn*, const char* css_name);

// Begin a Wayland drag as the source, offering the given local file paths (as
// text/uri-list + text/plain) so they can be dropped into other apps. Uses the
// last pointer-button serial as the implicit grab; the drag originates from the
// surface currently under the pointer.
void present_start_drag(WaylandConn*, const std::vector<std::string>& paths);

// ---- surfaces ----
Surface* surface_create(WaylandConn*, const SurfaceSpec&);
void surface_set_exclusive(Surface*, EdgeKind, int size);
void surface_set_region(Surface*, const std::vector<Rect>&);
void surface_show(Surface*);
void surface_hide(Surface*);
// Change keyboard interactivity at runtime (e.g. grab while a palette is open,
// release otherwise).
void surface_set_keyboard(Surface*, KeyboardMode);
void surface_destroy(Surface*);     // tears down; frees the Surface
bool surface_configured(Surface*);
// False after surface_hide until surface_show; callers must not present frames
// to a hidden surface (it would re-map it).
bool surface_visible(Surface*);
void surface_size(Surface*, int* w, int* h);
// Resolved output the surface landed on (connector name), for GPU selection.
const char* surface_output_name(Surface*);

// Present a WPE dmabuf; on_release runs when the compositor releases the buffer.
void surface_submit(Surface*, WPEBufferDMABuf*, std::function<void()> on_release);
// Called once per frame callback (vblank) so the host can tick WPE.
void surface_set_vblank_cb(Surface*, std::function<void()>);
// Called when the layer surface is configured (and on resize) with the actual
// pixel size; the host resizes the WPE view to match and emits `ready` once.
void surface_set_configure_cb(Surface*, std::function<void(int w, int h)>);
// Identify the surface for a given wl_surface (input routing).
wl_surface* surface_wl(Surface*);
