#include "present.h"

#include <wayland-client.h>
#include <wayland-cursor.h>
#define namespace namespace_   // layer-shell uses `namespace` (C++ keyword)
#include "wlr-layer-shell-unstable-v1-client.h"
#undef namespace
#include "linux-dmabuf-v1-client.h"

#include <glib.h>
#include <xkbcommon/xkbcommon.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>
#include <algorithm>
#include <cstdio>
#include <cstring>
#include <filesystem>

struct Output {
    WaylandConn* conn = nullptr;
    wl_output* output = nullptr;
    uint32_t global = 0;
    std::string name;
    int32_t width = 0, height = 0;   // current mode pixels
    int32_t refresh = 0;             // current mode refresh, mHz
};

struct WaylandConn {
    wl_display* display = nullptr;
    wl_registry* registry = nullptr;
    wl_compositor* compositor = nullptr;
    zwlr_layer_shell_v1* layer_shell = nullptr;
    zwp_linux_dmabuf_v1* dmabuf = nullptr;
    std::vector<Output*> outputs;

    wl_seat* seat = nullptr;
    wl_pointer* pointer = nullptr;
    wl_keyboard* keyboard = nullptr;
    InputSink sink;
    // Fired after any output add/remove/mode change so the host re-checks the mode.
    std::function<void()> on_outputs_changed;
    wl_surface* pointer_focus = nullptr;
    wl_surface* keyboard_focus = nullptr;
    double px = 0, py = 0;

    // Cursor: WebKit asks for a named cursor (set_cursor_from_name); we apply it
    // to the seat's pointer from a wl_cursor theme.
    wl_shm* shm = nullptr;
    uint32_t enter_serial = 0;
    wl_cursor_theme* cursor_theme = nullptr;
    wl_surface* cursor_surface = nullptr;
    std::string cursor_name = "default";

    // Scroll deltas accumulated within a wl_pointer frame (legacy axis + v120).
    double axis_x = 0, axis_y = 0;
    int v120_x = 0, v120_y = 0;

    xkb_context* xkb_ctx = nullptr;
    xkb_keymap* keymap = nullptr;
    xkb_state* kbstate = nullptr;

    dev_t main_device = 0;
    std::string render_node, primary_node;
};

struct Surface {
    WaylandConn* conn = nullptr;
    std::string role;
    wl_surface* wl = nullptr;
    zwlr_layer_surface_v1* layer = nullptr;
    wl_callback* frame_cb = nullptr;
    bool configured = false;
    // Sticky visibility. A hidden surface must not be re-mapped by an incoming
    // frame: without this, the next WPE buffer re-attaches and re-maps a surface
    // that surface_hide just unmapped — which for a keyboard-exclusive overlay
    // means it silently grabs the keyboard screen-wide again.
    bool visible = true;
    int width = 0, height = 0;
    std::string output_name;
    std::function<void()> vblank;
    std::function<void(int, int)> on_configure;
};

// ---------------------------------------------------------------- outputs ----
static void output_geometry(void*, wl_output*, int, int, int, int, int, const char*,
                            const char*, int) {}
static void output_mode(void* data, wl_output*, uint32_t flags, int w, int h, int refresh) {
    if (flags & WL_OUTPUT_MODE_CURRENT) {
        auto* o = static_cast<Output*>(data);
        o->width = w; o->height = h; o->refresh = refresh;
    }
}
// done batches the preceding mode/name/geometry events atomically — the right
// point to tell the host the output set or a mode settled (covers connect + mode
// switch). Disconnect is handled separately in reg_remove.
static void output_done(void* data, wl_output*) {
    auto* o = static_cast<Output*>(data);
    if (o->conn && o->conn->on_outputs_changed) {
        o->conn->on_outputs_changed();
    }
}
static void output_scale(void*, wl_output*, int) {}
static void output_name(void* data, wl_output*, const char* name) {
    static_cast<Output*>(data)->name = name ? name : "";
}
static void output_description(void*, wl_output*, const char*) {}
static const wl_output_listener output_listener = {
    output_geometry, output_mode, output_done, output_scale, output_name, output_description};

// ------------------------------------------------------------------ cursor ----
// Classic xcursor names for themes that lack the CSS-named aliases WebKit sends.
static const char* cursor_xname(const std::string& css) {
    if (css == "pointer") return "hand2";
    if (css == "grab") return "openhand";
    if (css == "grabbing") return "closedhand";
    if (css == "text" || css == "vertical-text") return "xterm";
    if (css == "move" || css == "all-scroll") return "fleur";
    if (css == "wait" || css == "progress") return "watch";
    if (css == "help") return "question_arrow";
    if (css == "crosshair") return "cross";
    if (css == "not-allowed" || css == "no-drop") return "crossed_circle";
    if (css == "ew-resize" || css == "col-resize") return "sb_h_double_arrow";
    if (css == "ns-resize" || css == "row-resize") return "sb_v_double_arrow";
    return "left_ptr";
}

void present_set_cursor(WaylandConn* c, const char* css_name) {
    if (!c || !c->pointer || !c->shm || !c->compositor) return;
    std::string name = (css_name && *css_name) ? css_name : "default";
    c->cursor_name = name;

    if (name == "none") {  // hide the cursor
        wl_pointer_set_cursor(c->pointer, c->enter_serial, nullptr, 0, 0);
        return;
    }
    if (!c->cursor_theme) {
        const char* theme = getenv("XCURSOR_THEME");
        const char* sz = getenv("XCURSOR_SIZE");
        int size = sz ? atoi(sz) : 24;
        if (size <= 0) size = 24;
        c->cursor_theme = wl_cursor_theme_load(theme, size, c->shm);
        if (!c->cursor_theme) return;
    }
    if (!c->cursor_surface)
        c->cursor_surface = wl_compositor_create_surface(c->compositor);

    wl_cursor* cur = wl_cursor_theme_get_cursor(c->cursor_theme, name.c_str());
    if (!cur) cur = wl_cursor_theme_get_cursor(c->cursor_theme, cursor_xname(name));
    if (!cur) cur = wl_cursor_theme_get_cursor(c->cursor_theme, "left_ptr");
    if (!cur || cur->image_count == 0) return;

    wl_cursor_image* img = cur->images[0];
    wl_buffer* buf = wl_cursor_image_get_buffer(img);
    if (!buf) return;
    wl_pointer_set_cursor(c->pointer, c->enter_serial, c->cursor_surface,
                          img->hotspot_x, img->hotspot_y);
    wl_surface_attach(c->cursor_surface, buf, 0, 0);
    wl_surface_damage(c->cursor_surface, 0, 0, img->width, img->height);
    wl_surface_commit(c->cursor_surface);
}

// ------------------------------------------------------------------ input ----
static void ptr_enter(void* data, wl_pointer*, uint32_t serial, wl_surface* surface,
                      wl_fixed_t sx, wl_fixed_t sy) {
    auto* c = static_cast<WaylandConn*>(data);
    c->pointer_focus = surface;
    c->enter_serial = serial;
    c->px = wl_fixed_to_double(sx); c->py = wl_fixed_to_double(sy);
    present_set_cursor(c, c->cursor_name.c_str());  // restore cursor with the new serial
    if (c->sink.pointer_enter) c->sink.pointer_enter(surface, c->px, c->py);
}
static void ptr_leave(void* data, wl_pointer*, uint32_t, wl_surface*) {
    auto* c = static_cast<WaylandConn*>(data);
    // Notify WPE so the page clears :hover / fires pointerleave; without this the
    // last-hovered element stays hovered until the pointer enters another surface.
    if (c->pointer_focus && c->sink.pointer_leave)
        c->sink.pointer_leave(c->pointer_focus, c->px, c->py);
    c->pointer_focus = nullptr;
}
static void ptr_motion(void* data, wl_pointer*, uint32_t, wl_fixed_t sx, wl_fixed_t sy) {
    auto* c = static_cast<WaylandConn*>(data);
    c->px = wl_fixed_to_double(sx); c->py = wl_fixed_to_double(sy);
    if (c->pointer_focus && c->sink.pointer_motion)
        c->sink.pointer_motion(c->pointer_focus, c->px, c->py);
}
static void ptr_button(void* data, wl_pointer*, uint32_t, uint32_t, uint32_t button,
                       uint32_t state) {
    auto* c = static_cast<WaylandConn*>(data);
    if (c->pointer_focus && c->sink.pointer_button)
        c->sink.pointer_button(c->pointer_focus, c->px, c->py, button,
                               state == WL_POINTER_BUTTON_STATE_PRESSED);
}
// Pixels of scroll per wheel notch. WebKit receives precise (pixel) deltas.
static constexpr double SCROLL_PIXELS_PER_NOTCH = 48.0;

static void ptr_axis(void* data, wl_pointer*, uint32_t, uint32_t axis, wl_fixed_t value) {
    auto* c = static_cast<WaylandConn*>(data);
    double v = wl_fixed_to_double(value);
    if (axis == WL_POINTER_AXIS_VERTICAL_SCROLL) c->axis_y += v;
    else if (axis == WL_POINTER_AXIS_HORIZONTAL_SCROLL) c->axis_x += v;
}
// High-resolution scroll (modern mice/touchpads): 120 units per logical notch.
static void ptr_v120(void* data, wl_pointer*, uint32_t axis, int32_t value) {
    auto* c = static_cast<WaylandConn*>(data);
    if (axis == WL_POINTER_AXIS_VERTICAL_SCROLL) c->v120_y += value;
    else if (axis == WL_POINTER_AXIS_HORIZONTAL_SCROLL) c->v120_x += value;
}
// Emit one accumulated scroll per frame; prefer v120 when present (else legacy).
static void ptr_frame(void* data, wl_pointer*) {
    auto* c = static_cast<WaylandConn*>(data);
    double dx = 0, dy = 0;
    if (c->v120_x || c->v120_y) {
        dx = (c->v120_x / 120.0) * SCROLL_PIXELS_PER_NOTCH;
        dy = (c->v120_y / 120.0) * SCROLL_PIXELS_PER_NOTCH;
    } else if (c->axis_x != 0 || c->axis_y != 0) {
        dx = c->axis_x * (SCROLL_PIXELS_PER_NOTCH / 10.0);
        dy = c->axis_y * (SCROLL_PIXELS_PER_NOTCH / 10.0);
    }
    c->axis_x = c->axis_y = 0;
    c->v120_x = c->v120_y = 0;
    // WPE's scroll-delta sign is opposite the Wayland axis sign, so negate.
    if ((dx != 0 || dy != 0) && c->pointer_focus && c->sink.pointer_axis)
        c->sink.pointer_axis(c->pointer_focus, c->px, c->py, -dx, -dy);
}
static void ptr_noop_src(void*, wl_pointer*, uint32_t) {}
static void ptr_noop_stop(void*, wl_pointer*, uint32_t, uint32_t) {}
static void ptr_noop_disc(void*, wl_pointer*, uint32_t, int32_t) {}
static void ptr_noop_dir(void*, wl_pointer*, uint32_t, uint32_t) {}
static const wl_pointer_listener pointer_listener = {
    ptr_enter, ptr_leave, ptr_motion, ptr_button, ptr_axis, ptr_frame,
    ptr_noop_src, ptr_noop_stop, ptr_noop_disc, ptr_v120, ptr_noop_dir};

static void kb_keymap(void* data, wl_keyboard*, uint32_t format, int fd, uint32_t size) {
    auto* c = static_cast<WaylandConn*>(data);
    if (format != WL_KEYBOARD_KEYMAP_FORMAT_XKB_V1) { close(fd); return; }
    char* map = (char*)mmap(nullptr, size, PROT_READ, MAP_PRIVATE, fd, 0);
    if (map == MAP_FAILED) { close(fd); return; }
    if (c->keymap) xkb_keymap_unref(c->keymap);
    if (c->kbstate) xkb_state_unref(c->kbstate);
    c->keymap = xkb_keymap_new_from_string(c->xkb_ctx, map, XKB_KEYMAP_FORMAT_TEXT_V1,
                                               XKB_KEYMAP_COMPILE_NO_FLAGS);
    munmap(map, size); close(fd);
    if (c->keymap) c->kbstate = xkb_state_new(c->keymap);
}
static void kb_enter(void* data, wl_keyboard*, uint32_t, wl_surface* surface, wl_array*) {
    static_cast<WaylandConn*>(data)->keyboard_focus = surface;
}
static void kb_leave(void* data, wl_keyboard*, uint32_t, wl_surface*) {
    static_cast<WaylandConn*>(data)->keyboard_focus = nullptr;
}
static void kb_key(void* data, wl_keyboard*, uint32_t, uint32_t, uint32_t key, uint32_t state) {
    auto* c = static_cast<WaylandConn*>(data);
    if (!c->keyboard_focus || !c->sink.key || !c->kbstate) return;
    uint32_t keycode = key + 8;   // evdev -> xkb keycode
    xkb_keysym_t sym = xkb_state_key_get_one_sym(c->kbstate, keycode);
    c->sink.key(c->keyboard_focus, keycode, sym, state == WL_KEYBOARD_KEY_STATE_PRESSED);
}
static void kb_mods(void* data, wl_keyboard*, uint32_t, uint32_t dep, uint32_t lat,
                    uint32_t lck, uint32_t grp) {
    auto* c = static_cast<WaylandConn*>(data);
    if (c->kbstate) xkb_state_update_mask(c->kbstate, dep, lat, lck, 0, 0, grp);
}
static void kb_repeat(void*, wl_keyboard*, int32_t, int32_t) {}
static const wl_keyboard_listener keyboard_listener = {
    kb_keymap, kb_enter, kb_leave, kb_key, kb_mods, kb_repeat};

static void seat_caps(void* data, wl_seat* seat, uint32_t caps) {
    auto* c = static_cast<WaylandConn*>(data);
    if ((caps & WL_SEAT_CAPABILITY_POINTER) && !c->pointer) {
        c->pointer = wl_seat_get_pointer(seat);
        wl_pointer_add_listener(c->pointer, &pointer_listener, c);
    }
    if ((caps & WL_SEAT_CAPABILITY_KEYBOARD) && !c->keyboard) {
        c->keyboard = wl_seat_get_keyboard(seat);
        wl_keyboard_add_listener(c->keyboard, &keyboard_listener, c);
    }
}
static void seat_name(void*, wl_seat*, const char*) {}
static const wl_seat_listener seat_listener = {seat_caps, seat_name};

static void seat_setup(WaylandConn* c) {
    if (!c->xkb_ctx) c->xkb_ctx = xkb_context_new(XKB_CONTEXT_NO_FLAGS);
    wl_seat_add_listener(c->seat, &seat_listener, c);
}

// --------------------------------------------------------------- registry ----
static void reg_global(void* data, wl_registry* r, uint32_t name, const char* iface,
                       uint32_t ver) {
    auto* c = static_cast<WaylandConn*>(data);
    if (!strcmp(iface, wl_compositor_interface.name)) {
        c->compositor = static_cast<wl_compositor*>(
            wl_registry_bind(r, name, &wl_compositor_interface, std::min(ver, 4u)));
    } else if (!strcmp(iface, zwlr_layer_shell_v1_interface.name)) {
        c->layer_shell = static_cast<zwlr_layer_shell_v1*>(
            wl_registry_bind(r, name, &zwlr_layer_shell_v1_interface, std::min(ver, 4u)));
    } else if (!strcmp(iface, zwp_linux_dmabuf_v1_interface.name)) {
        c->dmabuf = static_cast<zwp_linux_dmabuf_v1*>(
            wl_registry_bind(r, name, &zwp_linux_dmabuf_v1_interface, std::min(ver, 4u)));
    } else if (!strcmp(iface, wl_output_interface.name)) {
        auto* o = new Output();
        o->conn = c;
        o->global = name;
        o->output = static_cast<wl_output*>(
            wl_registry_bind(r, name, &wl_output_interface, std::min(ver, 4u)));
        wl_output_add_listener(o->output, &output_listener, o);
        c->outputs.push_back(o);
    } else if (!strcmp(iface, wl_seat_interface.name)) {
        c->seat = static_cast<wl_seat*>(
            wl_registry_bind(r, name, &wl_seat_interface, std::min(ver, 7u)));
        seat_setup(c);
    } else if (!strcmp(iface, wl_shm_interface.name)) {
        c->shm = static_cast<wl_shm*>(
            wl_registry_bind(r, name, &wl_shm_interface, std::min(ver, 1u)));
    }
}
// A removed global is an unplugged output (or other interface). Drop the matching
// Output and tell the host so it re-checks the mode.
static void reg_remove(void* data, wl_registry*, uint32_t name) {
    auto* c = static_cast<WaylandConn*>(data);
    for (auto it = c->outputs.begin(); it != c->outputs.end(); ++it) {
        if ((*it)->global != name) {
            continue;
        }
        wl_output_destroy((*it)->output);
        delete *it;
        c->outputs.erase(it);
        if (c->on_outputs_changed) {
            c->on_outputs_changed();
        }
        return;
    }
}
static const wl_registry_listener registry_listener = {reg_global, reg_remove};

// ---- dmabuf feedback: learn the compositor's render device ----
static void fb_done(void*, zwp_linux_dmabuf_feedback_v1*) {}
static void fb_format_table(void*, zwp_linux_dmabuf_feedback_v1*, int fd, uint32_t) { close(fd); }
static void fb_main_device(void* data, zwp_linux_dmabuf_feedback_v1*, wl_array* dev) {
    auto* c = static_cast<WaylandConn*>(data);
    if (dev->size == sizeof(dev_t)) memcpy(&c->main_device, dev->data, sizeof(dev_t));
}
static void fb_tranche_done(void*, zwp_linux_dmabuf_feedback_v1*) {}
static void fb_tranche_target(void*, zwp_linux_dmabuf_feedback_v1*, wl_array*) {}
static void fb_tranche_formats(void*, zwp_linux_dmabuf_feedback_v1*, wl_array*) {}
static void fb_tranche_flags(void*, zwp_linux_dmabuf_feedback_v1*, uint32_t) {}
static const zwp_linux_dmabuf_feedback_v1_listener feedback_listener = {
    fb_done, fb_format_table, fb_main_device, fb_tranche_done,
    fb_tranche_target, fb_tranche_formats, fb_tranche_flags};

static void resolve_nodes(WaylandConn* c) {
    if (!c->main_device) return;
    namespace fs = std::filesystem;
    std::error_code ec;
    std::string match;
    for (auto& e : fs::directory_iterator("/dev/dri", ec)) {
        struct stat st;
        if (stat(e.path().c_str(), &st) == 0 && st.st_rdev == c->main_device) {
            match = e.path().filename();
            break;
        }
    }
    if (match.empty()) return;
    auto dev = fs::canonical("/sys/class/drm/" + match + "/device", ec);
    if (ec) return;
    for (auto& e : fs::directory_iterator("/sys/class/drm", ec)) {
        std::string n = e.path().filename();
        auto d = fs::canonical(e.path() / "device", ec);
        if (ec || d != dev) continue;
        if (n.rfind("renderD", 0) == 0) c->render_node = "/dev/dri/" + n;
        else if (n.rfind("card", 0) == 0 && n.find('-') == std::string::npos)
            c->primary_node = "/dev/dri/" + n;
    }
}

WaylandConn* conn_new() {
    auto* c = new WaylandConn();
    c->display = wl_display_connect(nullptr);
    if (!c->display) { g_printerr("[present] no wayland display\n"); return c; }
    c->registry = wl_display_get_registry(c->display);
    wl_registry_add_listener(c->registry, &registry_listener, c);
    wl_display_roundtrip(c->display);   // globals
    wl_display_roundtrip(c->display);   // output names/modes
    if (!c->compositor || !c->layer_shell || !c->dmabuf)
        g_printerr("[present] missing globals: compositor=%p layer_shell=%p dmabuf=%p\n",
                   (void*)c->compositor, (void*)c->layer_shell, (void*)c->dmabuf);
    if (c->dmabuf && wl_proxy_get_version((wl_proxy*)c->dmabuf) >= 4) {
        auto* fb = zwp_linux_dmabuf_v1_get_default_feedback(c->dmabuf);
        zwp_linux_dmabuf_feedback_v1_add_listener(fb, &feedback_listener, c);
        wl_display_roundtrip(c->display);
        zwp_linux_dmabuf_feedback_v1_destroy(fb);
        resolve_nodes(c);
        g_printerr("[present] compositor render node: %s (primary %s)\n",
                   c->render_node.empty() ? "?" : c->render_node.c_str(),
                   c->primary_node.empty() ? "?" : c->primary_node.c_str());
    }
    return c;
}
const char* conn_render_node(WaylandConn* c) { return c->render_node.c_str(); }
const char* conn_primary_node(WaylandConn* c) { return c->primary_node.c_str(); }

// Current mode of the named output, or the first output when name is empty. Used
// to seed the WPE display with the real refresh rate instead of a hardcoded one.
bool conn_output_mode(WaylandConn* c, const char* name, int* w, int* h, int* refresh) {
    Output* picked = nullptr;
    if (name && *name) {
        for (auto* o : c->outputs)
            if (o->name == name) { picked = o; break; }
    } else if (!c->outputs.empty()) {
        picked = c->outputs.front();
    }
    if (!picked || picked->refresh <= 0) {
        return false;
    }
    if (w) *w = picked->width;
    if (h) *h = picked->height;
    if (refresh) *refresh = picked->refresh;
    return true;
}
void conn_set_input(WaylandConn* c, InputSink sink) { c->sink = std::move(sink); }
void conn_set_outputs_changed_cb(WaylandConn* c, std::function<void()> cb) {
    c->on_outputs_changed = std::move(cb);
}
bool conn_ok(WaylandConn* c) { return c->display && c->compositor && c->layer_shell && c->dmabuf; }
int conn_fd(WaylandConn* c) { return wl_display_get_fd(c->display); }
void conn_flush(WaylandConn* c) { wl_display_flush(c->display); }
void conn_dispatch(WaylandConn* c) {
    if (wl_display_prepare_read(c->display) == 0)
        wl_display_read_events(c->display);
    else
        wl_display_cancel_read(c->display);
    wl_display_dispatch_pending(c->display);
    wl_display_flush(c->display);
}

static wl_output* find_output(WaylandConn* c, const std::string& name, Output** picked) {
    if (!name.empty())
        for (auto* o : c->outputs)
            if (o->name == name) { *picked = o; return o->output; }
    if (!c->outputs.empty()) { *picked = c->outputs.front(); return c->outputs.front()->output; }
    *picked = nullptr;
    return nullptr;
}

// ----------------------------------------------------------- layer surface ----
static void ls_configure(void* data, zwlr_layer_surface_v1* ls, uint32_t serial,
                         uint32_t w, uint32_t h) {
    auto* s = static_cast<Surface*>(data);
    zwlr_layer_surface_v1_ack_configure(ls, serial);
    bool first = !s->configured;
    s->configured = true;
    if (w) s->width = (int)w;
    if (h) s->height = (int)h;
    if (s->on_configure) s->on_configure(s->width, s->height);
    if (first)
        g_printerr("[present] surface '%s' configured %dx%d\n", s->role.c_str(),
                   s->width, s->height);
}
static void ls_closed(void*, zwlr_layer_surface_v1*) {}
static const zwlr_layer_surface_v1_listener ls_listener = {ls_configure, ls_closed};

static uint32_t to_sctk_anchor(uint32_t a) {
    uint32_t r = 0;
    if (a & ANCHOR_TOP) r |= ZWLR_LAYER_SURFACE_V1_ANCHOR_TOP;
    if (a & ANCHOR_BOTTOM) r |= ZWLR_LAYER_SURFACE_V1_ANCHOR_BOTTOM;
    if (a & ANCHOR_LEFT) r |= ZWLR_LAYER_SURFACE_V1_ANCHOR_LEFT;
    if (a & ANCHOR_RIGHT) r |= ZWLR_LAYER_SURFACE_V1_ANCHOR_RIGHT;
    return r;
}
static uint32_t to_sctk_kb(KeyboardMode k) {
    switch (k) {
        case KB_EXCLUSIVE: return ZWLR_LAYER_SURFACE_V1_KEYBOARD_INTERACTIVITY_EXCLUSIVE;
        case KB_ONDEMAND: return ZWLR_LAYER_SURFACE_V1_KEYBOARD_INTERACTIVITY_ON_DEMAND;
        default: return ZWLR_LAYER_SURFACE_V1_KEYBOARD_INTERACTIVITY_NONE;
    }
}

Surface* surface_create(WaylandConn* c, const SurfaceSpec& spec) {
    auto* s = new Surface();
    s->conn = c;
    s->role = spec.role;
    s->wl = wl_compositor_create_surface(c->compositor);

    Output* picked = nullptr;
    wl_output* output = find_output(c, spec.monitor, &picked);
    if (picked) s->output_name = picked->name;
    std::string ns = "neoshell." + spec.role;
    s->layer = zwlr_layer_shell_v1_get_layer_surface(
        c->layer_shell, s->wl, output, (uint32_t)spec.layer, ns.c_str());
    zwlr_layer_surface_v1_add_listener(s->layer, &ls_listener, s);
    zwlr_layer_surface_v1_set_anchor(s->layer, to_sctk_anchor(spec.anchors));
    zwlr_layer_surface_v1_set_keyboard_interactivity(s->layer, to_sctk_kb(spec.keyboard));

    if (spec.exclusive_edge != EDGE_NONE && spec.exclusive_size > 0) {
        zwlr_layer_surface_v1_set_exclusive_zone(s->layer, spec.exclusive_size);
        if (spec.exclusive_edge == EDGE_TOP || spec.exclusive_edge == EDGE_BOTTOM)
            zwlr_layer_surface_v1_set_size(s->layer, 0, spec.exclusive_size);
        else
            zwlr_layer_surface_v1_set_size(s->layer, spec.exclusive_size, 0);
    } else {
        // Resolve size: spanning anchors imply the output dimension; else explicit.
        bool spans_h = (spec.anchors & ANCHOR_LEFT) && (spec.anchors & ANCHOR_RIGHT);
        bool spans_v = (spec.anchors & ANCHOR_TOP) && (spec.anchors & ANCHOR_BOTTOM);
        int w = spec.width, h = spec.height;
        if (w == 0 && !spans_h && picked) w = picked->width;
        if (h == 0 && !spans_v && picked) h = picked->height;
        zwlr_layer_surface_v1_set_size(s->layer, std::max(0, w), std::max(0, h));
    }
    wl_surface_commit(s->wl);
    wl_display_flush(c->display);
    return s;
}

void surface_set_exclusive(Surface* s, EdgeKind edge, int size) {
    zwlr_layer_surface_v1_set_exclusive_zone(s->layer, size > 0 ? size : 0);
    wl_surface_commit(s->wl);
    wl_display_flush(s->conn->display);
}

void surface_set_region(Surface* s, const std::vector<Rect>& rects) {
    if (rects.empty()) {
        // Empty region = fully click-through.
        wl_region* region = wl_compositor_create_region(s->conn->compositor);
        wl_surface_set_input_region(s->wl, region);
        wl_region_destroy(region);
    } else {
        wl_region* region = wl_compositor_create_region(s->conn->compositor);
        for (const auto& r : rects) wl_region_add(region, r.x, r.y, r.w, r.h);
        wl_surface_set_input_region(s->wl, region);
        wl_region_destroy(region);
    }
    wl_surface_commit(s->wl);
    wl_display_flush(s->conn->display);
}

void surface_show(Surface* s) {
    s->visible = true;
    // The surface re-maps when the next buffer arrives; kick a frame so a quiescent
    // page (no pending repaint) still re-appears instead of waiting for input.
    if (s->vblank) s->vblank();
}
void surface_hide(Surface* s) {
    s->visible = false;
    wl_surface_attach(s->wl, nullptr, 0, 0);
    wl_surface_commit(s->wl);
    wl_display_flush(s->conn->display);
}
bool surface_visible(Surface* s) { return s->visible; }
void surface_destroy(Surface* s) {
    if (s->frame_cb) wl_callback_destroy(s->frame_cb);
    if (s->layer) zwlr_layer_surface_v1_destroy(s->layer);
    if (s->wl) wl_surface_destroy(s->wl);
    wl_display_flush(s->conn->display);
    delete s;
}
bool surface_configured(Surface* s) { return s->configured; }
void surface_size(Surface* s, int* w, int* h) { *w = s->width; *h = s->height; }
const char* surface_output_name(Surface* s) { return s->output_name.c_str(); }
void surface_set_vblank_cb(Surface* s, std::function<void()> cb) { s->vblank = std::move(cb); }
void surface_set_configure_cb(Surface* s, std::function<void(int, int)> cb) {
    s->on_configure = std::move(cb);
}
wl_surface* surface_wl(Surface* s) { return s->wl; }

// --------------------------------------------------------------- present ----
static void frame_done(void* data, wl_callback* cb, uint32_t);
static const wl_callback_listener frame_listener = {frame_done};
static void frame_done(void* data, wl_callback* cb, uint32_t) {
    auto* s = static_cast<Surface*>(data);
    if (s->frame_cb) { wl_callback_destroy(s->frame_cb); s->frame_cb = nullptr; }
    if (s->vblank) s->vblank();
}

static void buffer_release(void* data, wl_buffer* buf) {
    auto* release = static_cast<std::function<void()>*>(data);
    if (release && *release) (*release)();
    delete release;
    wl_buffer_destroy(buf);
}
static const wl_buffer_listener buffer_listener = {buffer_release};

void surface_submit(Surface* s, WPEBufferDMABuf* dma, std::function<void()> on_release) {
    WaylandConn* c = s->conn;
    int w = wpe_buffer_get_width(WPE_BUFFER(dma));
    int h = wpe_buffer_get_height(WPE_BUFFER(dma));
    uint32_t fourcc = wpe_buffer_dma_buf_get_format(dma);
    uint64_t mod = wpe_buffer_dma_buf_get_modifier(dma);
    uint32_t n_planes = wpe_buffer_dma_buf_get_n_planes(dma);

    zwp_linux_buffer_params_v1* params = zwp_linux_dmabuf_v1_create_params(c->dmabuf);
    for (uint32_t i = 0; i < n_planes; i++)
        zwp_linux_buffer_params_v1_add(params, wpe_buffer_dma_buf_get_fd(dma, i), i,
                                       wpe_buffer_dma_buf_get_offset(dma, i),
                                       wpe_buffer_dma_buf_get_stride(dma, i),
                                       mod >> 32, mod & 0xffffffff);
    wl_buffer* buffer = zwp_linux_buffer_params_v1_create_immed(params, w, h, fourcc, 0);
    zwp_linux_buffer_params_v1_destroy(params);
    if (!buffer) {
        g_printerr("[present] create_immed NULL — import rejected (mod 0x%llx)\n",
                   (unsigned long long)mod);
        if (on_release) on_release();
        return;
    }

    auto* release = new std::function<void()>(std::move(on_release));
    wl_buffer_add_listener(buffer, &buffer_listener, release);

    s->frame_cb = wl_surface_frame(s->wl);
    wl_callback_add_listener(s->frame_cb, &frame_listener, s);
    wl_surface_attach(s->wl, buffer, 0, 0);
    wl_surface_damage_buffer(s->wl, 0, 0, w, h);
    wl_surface_commit(s->wl);
    wl_display_flush(c->display);
}
