#include "present.h"

#include <wayland-client.h>
#include <wayland-cursor.h>
#define namespace namespace_   // layer-shell uses `namespace` (C++ keyword)
#include "wlr-layer-shell-unstable-v1-client.h"
#undef namespace
#include "linux-dmabuf-v1-client.h"

#include <glib.h>
#include <glib-unix.h>
#include <xkbcommon/xkbcommon.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>
#include <algorithm>
#include <cstdio>
#include <cstring>
#include <filesystem>
#include <string>

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

    // Drag-and-drop: a data device on the seat delivers file drops. dnd_offer is
    // the offer currently hovering a surface; coords are surface-local.
    wl_data_device_manager* data_device_manager = nullptr;
    wl_data_device* data_device = nullptr;
    wl_data_offer* dnd_offer = nullptr;
    wl_surface* dnd_surface = nullptr;
    double dnd_x = 0, dnd_y = 0;
    uint32_t dnd_enter_serial = 0;
    bool dnd_accepted = false;     // whether we accepted a mime for the drag
    gint64 last_drag_us = 0;       // throttle for forwarded motion

    // Drag source (dragging staged files out to other apps).
    uint32_t last_button_serial = 0;
    wl_data_source* drag_source = nullptr;
    std::vector<std::string> drag_source_paths;
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

    // Key repeat: Wayland delivers a single key event; the client repeats it. The
    // compositor advertises rate (keys/sec) and delay (ms) via wl_keyboard.repeat_info.
    int32_t repeat_rate = 25;
    int32_t repeat_delay = 600;
    guint repeat_timer = 0;      // glib source for the active repeat, 0 = none
    uint32_t repeat_keycode = 0; // xkb keycode currently repeating
    xkb_keysym_t repeat_sym = 0;

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
static void ptr_button(void* data, wl_pointer*, uint32_t serial, uint32_t, uint32_t button,
                       uint32_t state) {
    auto* c = static_cast<WaylandConn*>(data);
    c->last_button_serial = serial;   // implicit-grab serial for start_drag
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
// current_mods reads the live modifier state from xkb into the portable KeyMod
// bitmask so key events carry Ctrl/Shift/Alt/Meta to the WPE layer.
static uint32_t current_mods(WaylandConn* c) {
    if (!c->kbstate) return 0;
    auto active = [&](const char* name) {
        return xkb_state_mod_name_is_active(c->kbstate, name, XKB_STATE_MODS_EFFECTIVE) > 0;
    };
    uint32_t mods = 0;
    if (active(XKB_MOD_NAME_CTRL)) mods |= MOD_CTRL;
    if (active(XKB_MOD_NAME_SHIFT)) mods |= MOD_SHIFT;
    if (active(XKB_MOD_NAME_ALT)) mods |= MOD_ALT;
    if (active(XKB_MOD_NAME_LOGO)) mods |= MOD_META;
    if (active(XKB_MOD_NAME_CAPS)) mods |= MOD_CAPS;
    return mods;
}

static void cancel_repeat(WaylandConn* c) {
    if (c->repeat_timer) {
        g_source_remove(c->repeat_timer);
        c->repeat_timer = 0;
    }
}

static gboolean repeat_tick(gpointer data) {
    auto* c = static_cast<WaylandConn*>(data);
    if (c->keyboard_focus && c->sink.key) {
        c->sink.key(c->keyboard_focus, c->repeat_keycode, c->repeat_sym, current_mods(c), true);
    }
    return G_SOURCE_CONTINUE;
}

// After the initial delay, emit one repeat and switch to the steady interval.
static gboolean repeat_begin(gpointer data) {
    auto* c = static_cast<WaylandConn*>(data);
    repeat_tick(data);
    int interval = c->repeat_rate > 0 ? 1000 / c->repeat_rate : 40;
    c->repeat_timer = g_timeout_add(interval, repeat_tick, c);
    return G_SOURCE_REMOVE;
}

static void kb_enter(void* data, wl_keyboard*, uint32_t, wl_surface* surface, wl_array*) {
    auto* c = static_cast<WaylandConn*>(data);
    c->keyboard_focus = surface;
    if (c->sink.keyboard_focus) c->sink.keyboard_focus(surface, true);
}
static void kb_leave(void* data, wl_keyboard*, uint32_t, wl_surface* surface) {
    auto* c = static_cast<WaylandConn*>(data);
    cancel_repeat(c);
    if (c->sink.keyboard_focus) c->sink.keyboard_focus(surface, false);
    c->keyboard_focus = nullptr;
}
static void kb_key(void* data, wl_keyboard*, uint32_t, uint32_t, uint32_t key, uint32_t state) {
    auto* c = static_cast<WaylandConn*>(data);
    if (!c->keyboard_focus || !c->sink.key || !c->kbstate) return;
    uint32_t keycode = key + 8;   // evdev -> xkb keycode
    xkb_keysym_t sym = xkb_state_key_get_one_sym(c->kbstate, keycode);
    bool pressed = state == WL_KEYBOARD_KEY_STATE_PRESSED;
    c->sink.key(c->keyboard_focus, keycode, sym, current_mods(c), pressed);

    if (!pressed) {
        if (keycode == c->repeat_keycode) cancel_repeat(c);
        return;
    }
    // Arm auto-repeat for the pressed key (if the keymap marks it repeatable).
    cancel_repeat(c);
    if (c->repeat_rate > 0 && c->keymap && xkb_keymap_key_repeats(c->keymap, keycode)) {
        c->repeat_keycode = keycode;
        c->repeat_sym = sym;
        c->repeat_timer = g_timeout_add(c->repeat_delay > 0 ? c->repeat_delay : 600,
                                        repeat_begin, c);
    }
}
static void kb_mods(void* data, wl_keyboard*, uint32_t, uint32_t dep, uint32_t lat,
                    uint32_t lck, uint32_t grp) {
    auto* c = static_cast<WaylandConn*>(data);
    if (c->kbstate) xkb_state_update_mask(c->kbstate, dep, lat, lck, 0, 0, grp);
}
static void kb_repeat(void* data, wl_keyboard*, int32_t rate, int32_t delay) {
    auto* c = static_cast<WaylandConn*>(data);
    c->repeat_rate = rate;
    c->repeat_delay = delay;
}
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

// ------------------------------------------------------------- drag & drop ----
// Per-offer scratch: which text-ish mimes the offer advertises. Kept on the
// wl_data_offer's user data so a clipboard offer never contaminates a drag.
// text/uri-list carries file paths (local drags) or URLs (browser drags);
// text/plain is a fallback that also carries a URL for browser image drags.
struct OfferData {
    WaylandConn* conn = nullptr;
    std::vector<std::string> mimes;
};

static void destroy_offer(wl_data_offer* offer) {
    if (!offer) return;
    delete static_cast<OfferData*>(wl_data_offer_get_user_data(offer));
    wl_data_offer_destroy(offer);
}

static bool has_mime(OfferData* od, const char* m) {
    for (const auto& s : od->mimes)
        if (s == m) return true;
    return false;
}

// The mime to request for a drop. Image flavors first (browser image drags give
// the actual bytes, which we save locally), then uri-list (file paths or a URL),
// then plain text. Null if nothing usable is offered.
static const char* offer_best_mime(OfferData* od) {
    if (!od) return nullptr;
    static const char* PRIORITY[] = {
        "image/png",       "image/jpeg", "image/jpg",
        "image/gif",       "image/webp", "image/bmp",
        "text/uri-list",   "text/plain;charset=utf-8", "text/plain",
    };
    for (const char* m : PRIORITY)
        if (has_mime(od, m)) return m;
    return nullptr;
}

static void try_accept(WaylandConn* c);

static void offer_mime(void*, wl_data_offer* offer, const char* mime) {
    // Read our per-offer data from the proxy (set after add_listener so it isn't
    // clobbered). The listener `data` arg is unreliable for the same reason.
    auto* od = static_cast<OfferData*>(wl_data_offer_get_user_data(offer));
    if (mime && od) od->mimes.push_back(mime);
    // Don't log here: offer_mime runs for clipboard selection offers too (the
    // compositor re-advertises the selection on every focus change), so logging
    // mimes at this point looks like a phantom drag. Log at dd_enter instead,
    // where the offer is known to be an actual drag.
    // Mimes stream in before OR after enter. Once this offer is the active drag
    // and advertises something usable, accept it (needed for the drop to fire).
    if (od && od->conn && offer == od->conn->dnd_offer) try_accept(od->conn);
}
static void offer_source_actions(void*, wl_data_offer*, uint32_t) {}
static void offer_action(void*, wl_data_offer*, uint32_t) {}
static const wl_data_offer_listener offer_listener = {
    offer_mime, offer_source_actions, offer_action};

static std::string url_decode(const std::string& s) {
    auto hex = [](char ch) -> int {
        if (ch >= '0' && ch <= '9') return ch - '0';
        if (ch >= 'a' && ch <= 'f') return ch - 'a' + 10;
        if (ch >= 'A' && ch <= 'F') return ch - 'A' + 10;
        return -1;
    };
    std::string out;
    out.reserve(s.size());
    for (size_t i = 0; i < s.size(); i++) {
        if (s[i] == '%' && i + 2 < s.size()) {
            int hi = hex(s[i + 1]), lo = hex(s[i + 2]);
            if (hi >= 0 && lo >= 0) {
                out.push_back(static_cast<char>(hi * 16 + lo));
                i += 2;
                continue;
            }
        }
        out.push_back(s[i]);
    }
    return out;
}

// Parse a text/uri-list payload into absolute filesystem paths, stripping the
// file:// scheme (and optional host) and percent-decoding.
static std::vector<std::string> parse_uri_list(const std::string& text) {
    std::vector<std::string> paths;
    size_t start = 0;
    while (start <= text.size()) {
        size_t nl = text.find('\n', start);
        std::string line = (nl == std::string::npos) ? text.substr(start)
                                                      : text.substr(start, nl - start);
        while (!line.empty() && (line.back() == '\r' || line.back() == ' '))
            line.pop_back();
        size_t first = line.find_first_not_of(" \t");
        if (first != std::string::npos) line.erase(0, first);

        if (!line.empty() && line[0] != '#') {
            if (line.rfind("file://", 0) == 0) {
                std::string rest = line.substr(7);            // strip "file://"
                size_t slash = rest.find('/');                // skip optional host
                std::string path = (slash == std::string::npos) ? rest : rest.substr(slash);
                paths.push_back(url_decode(path));
            } else {
                paths.push_back(line);
            }
        }
        if (nl == std::string::npos) break;
        start = nl + 1;
    }
    return paths;
}

// Base directory for dropped images. XDG_DATA_HOME (default ~/.local/share) is
// persisted across restarts, unlike XDG_RUNTIME_DIR's tmpfs.
static std::string drops_base_dir() {
    const char* dataHome = getenv("XDG_DATA_HOME");
    if (dataHome && *dataHome) return std::string(dataHome) + "/neoshell/drops";
    const char* home = getenv("HOME");
    if (home && *home) return std::string(home) + "/.local/share/neoshell/drops";
    return std::string("/tmp/neoshell-drops");
}

// Save raw image bytes from a browser drag to a file under XDG_DATA_HOME so it
// survives logout/restart. Returns the path.
static std::string save_dropped_image(const std::string& bytes, const std::string& mime) {
    std::string dir = drops_base_dir();
    std::error_code ec;
    std::filesystem::create_directories(dir, ec);

    const char* ext = "png";
    if (mime.find("jpeg") != std::string::npos || mime.find("jpg") != std::string::npos)
        ext = "jpg";
    else if (mime.find("gif") != std::string::npos) ext = "gif";
    else if (mime.find("webp") != std::string::npos) ext = "webp";
    else if (mime.find("bmp") != std::string::npos) ext = "bmp";

    static int counter = 0;
    std::string path = dir + "/drop-" + std::to_string(g_get_real_time()) + "-" +
                       std::to_string(counter++) + "." + ext;
    FILE* file = fopen(path.c_str(), "wb");
    if (!file) return "";
    if (!bytes.empty()) fwrite(bytes.data(), 1, bytes.size(), file);
    fclose(file);
    return path;
}

// Async read of the drop payload: the source writes into a pipe we drain off the
// GLib loop, so the compositor thread never blocks on it. Image mimes are saved
// to a temp file; text mimes (uri-list/plain) are parsed into paths or URLs.
struct DndRead {
    WaylandConn* conn;
    wl_data_offer* offer;
    wl_surface* surface;
    double x, y;
    std::string mime;
    std::string buf;
};

static gboolean dnd_read_cb(gint fd, GIOCondition, gpointer data) {
    auto* rd = static_cast<DndRead*>(data);
    char tmp[4096];
    ssize_t n = read(fd, tmp, sizeof(tmp));
    if (n > 0) {
        rd->buf.append(tmp, static_cast<size_t>(n));
        return G_SOURCE_CONTINUE;
    }
    close(fd);
    // Note: intentionally not calling wl_data_offer_finish(). With XWayland-
    // bridged drags the DnD action often isn't cleanly negotiated, and finish()
    // then raises a fatal invalid_finish protocol error that aborts the client.
    // The payload is already read, so finish is only a courtesy to the source.
    if (rd->offer) destroy_offer(rd->offer);

    std::vector<std::string> paths;
    if (rd->mime.rfind("image/", 0) == 0) {
        std::string path = save_dropped_image(rd->buf, rd->mime);
        g_printerr("[dnd] saved image: %zu bytes -> %s\n", rd->buf.size(), path.c_str());
        if (!path.empty()) paths.push_back(path);
    } else {
        paths = parse_uri_list(rd->buf);
        g_printerr("[dnd] read done: %zu bytes, %zu path(s)\n", rd->buf.size(), paths.size());
    }
    if (!paths.empty() && rd->conn->sink.drop)
        rd->conn->sink.drop(rd->surface, rd->x, rd->y, paths);
    delete rd;
    return G_SOURCE_REMOVE;
}

static void start_uri_read(WaylandConn* c, const char* mime) {
    int fds[2];
    if (pipe2(fds, O_CLOEXEC) < 0) {
        destroy_offer(c->dnd_offer);
        c->dnd_offer = nullptr;
        c->dnd_surface = nullptr;
        return;
    }
    wl_data_offer_receive(c->dnd_offer, mime, fds[1]);
    close(fds[1]);
    wl_display_flush(c->display);

    auto* rd = new DndRead{c, c->dnd_offer, c->dnd_surface, c->dnd_x, c->dnd_y, mime, ""};
    c->dnd_offer = nullptr;       // ownership moves to the async reader
    c->dnd_surface = nullptr;
    g_unix_fd_add(fds[0], static_cast<GIOCondition>(G_IO_IN | G_IO_HUP), dnd_read_cb, rd);
}

// accept_offer tells the compositor we take `mime` (COPY). Accepting a mime
// during the drag is required for the compositor to send the drop event.
static void accept_offer(WaylandConn* c, wl_data_offer* offer, const char* mime) {
    wl_data_offer_accept(offer, c->dnd_enter_serial, mime);
    if (mime && wl_proxy_get_version(reinterpret_cast<wl_proxy*>(offer)) >= 3)
        wl_data_offer_set_actions(offer, WL_DATA_DEVICE_MANAGER_DND_ACTION_COPY,
                                  WL_DATA_DEVICE_MANAGER_DND_ACTION_COPY);
    c->dnd_accepted = mime != nullptr;
}

// Accept the active drag's best mime if we haven't yet and one is now known,
// then signal enter so the surface can expand. Never rejects (a null accept
// would make the compositor cancel the drop), so this is safe to call anytime.
static void try_accept(WaylandConn* c) {
    if (!c->dnd_offer || c->dnd_accepted) return;
    auto* od = static_cast<OfferData*>(wl_data_offer_get_user_data(c->dnd_offer));
    const char* mime = offer_best_mime(od);
    if (!mime) return;
    accept_offer(c, c->dnd_offer, mime);
    g_printerr("[dnd] accepted mime=%s\n", mime);
    if (c->sink.drag_enter) c->sink.drag_enter(c->dnd_surface, c->dnd_x, c->dnd_y);
}

static void dd_data_offer(void* data, wl_data_device*, wl_data_offer* offer) {
    auto* od = new OfferData();
    od->conn = static_cast<WaylandConn*>(data);   // device listener data = WaylandConn*
    // add_listener overwrites the proxy's user_data, so set ours AFTERWARD; the
    // callbacks then read our OfferData back via wl_data_offer_get_user_data.
    wl_data_offer_add_listener(offer, &offer_listener, nullptr);
    wl_data_offer_set_user_data(offer, od);
}
static void dd_enter(void* data, wl_data_device*, uint32_t serial, wl_surface* surface,
                     wl_fixed_t x, wl_fixed_t y, wl_data_offer* offer) {
    auto* c = static_cast<WaylandConn*>(data);
    c->dnd_offer = offer;
    c->dnd_surface = surface;
    c->dnd_enter_serial = serial;
    c->dnd_accepted = false;
    c->dnd_x = wl_fixed_to_double(x);
    c->dnd_y = wl_fixed_to_double(y);
    g_printerr("[dnd] enter surface=%p at %.0f,%.0f\n", (void*)surface, c->dnd_x, c->dnd_y);
    auto* od = static_cast<OfferData*>(
        offer ? wl_data_offer_get_user_data(offer) : nullptr);
    if (od)
        for (const auto& mime : od->mimes)
            g_printerr("[dnd] offer mime: %s\n", mime.c_str());
    // Accept now if the mimes already arrived; otherwise offer_mime will, once
    // this offer advertises a usable type.
    if (offer) try_accept(c);
}
static void dd_leave(void* data, wl_data_device*) {
    auto* c = static_cast<WaylandConn*>(data);
    if (c->dnd_surface && c->sink.drag_leave) c->sink.drag_leave(c->dnd_surface);
    destroy_offer(c->dnd_offer);
    c->dnd_offer = nullptr;
    c->dnd_surface = nullptr;
}
static void dd_motion(void* data, wl_data_device*, uint32_t, wl_fixed_t x, wl_fixed_t y) {
    auto* c = static_cast<WaylandConn*>(data);
    c->dnd_x = wl_fixed_to_double(x);
    c->dnd_y = wl_fixed_to_double(y);
    if (!c->dnd_offer) return;
    try_accept(c);   // covers offers whose mimes arrived between enter and now
    // Forward live position (throttled) so the surface can track the drag.
    if (c->dnd_accepted && c->sink.drag_motion) {
        gint64 now = g_get_monotonic_time();
        if (now - c->last_drag_us >= 33000) {
            c->last_drag_us = now;
            c->sink.drag_motion(c->dnd_surface, c->dnd_x, c->dnd_y);
        }
    }
}
static void dd_drop(void* data, wl_data_device*) {
    auto* c = static_cast<WaylandConn*>(data);
    if (!c->dnd_offer) {
        g_printerr("[dnd] drop with no offer\n");
        return;
    }
    auto* od = static_cast<OfferData*>(wl_data_offer_get_user_data(c->dnd_offer));
    const char* mime = offer_best_mime(od);
    g_printerr("[dnd] drop mime=%s\n", mime ? mime : "(none)");
    if (!mime) {
        destroy_offer(c->dnd_offer);
        c->dnd_offer = nullptr;
        c->dnd_surface = nullptr;
        return;
    }
    start_uri_read(c, mime);
}
static void dd_selection(void*, wl_data_device*, wl_data_offer* offer) {
    // Clipboard selection; unused by the render host. Release the offer.
    destroy_offer(offer);
}
static const wl_data_device_listener data_device_listener = {
    dd_data_offer, dd_enter, dd_leave, dd_motion, dd_drop, dd_selection};

static void setup_data_device(WaylandConn* c) {
    if (c->data_device) return;
    if (!c->seat || !c->data_device_manager) {
        g_printerr("[dnd] not set up: seat=%p data_device_manager=%p\n",
                   (void*)c->seat, (void*)c->data_device_manager);
        return;
    }
    c->data_device =
        wl_data_device_manager_get_data_device(c->data_device_manager, c->seat);
    wl_data_device_add_listener(c->data_device, &data_device_listener, c);
    g_printerr("[dnd] data device ready\n");
}

// ---- drag source (dragging staged files out to other apps) ----
static void src_target(void*, wl_data_source*, const char*) {}
static void src_send(void* data, wl_data_source*, const char* mime, int fd) {
    auto* c = static_cast<WaylandConn*>(data);
    std::string payload;
    if (mime && strcmp(mime, "text/uri-list") == 0) {
        for (const auto& path : c->drag_source_paths)
            payload += "file://" + path + "\r\n";
    } else {  // text/plain
        for (size_t i = 0; i < c->drag_source_paths.size(); i++) {
            if (i) payload += "\n";
            payload += c->drag_source_paths[i];
        }
    }
    size_t off = 0;
    while (off < payload.size()) {
        ssize_t n = write(fd, payload.data() + off, payload.size() - off);
        if (n <= 0) break;
        off += static_cast<size_t>(n);
    }
    close(fd);
}
static void src_clear(WaylandConn* c, wl_data_source* src) {
    wl_data_source_destroy(src);
    if (c->drag_source == src) c->drag_source = nullptr;
}
static void src_cancelled(void* data, wl_data_source* src) {
    src_clear(static_cast<WaylandConn*>(data), src);
}
static void src_dnd_drop_performed(void*, wl_data_source*) {}
static void src_dnd_finished(void* data, wl_data_source* src) {
    src_clear(static_cast<WaylandConn*>(data), src);
}
static void src_action(void*, wl_data_source*, uint32_t) {}
static const wl_data_source_listener source_listener = {
    src_target, src_send, src_cancelled, src_dnd_drop_performed,
    src_dnd_finished, src_action};

void present_start_drag(WaylandConn* c, const std::vector<std::string>& paths) {
    if (!c->data_device || !c->data_device_manager) {
        g_printerr("[dnd] start_drag: no data device\n");
        return;
    }
    if (!c->pointer_focus) {
        g_printerr("[dnd] start_drag: no pointer focus (need a held button)\n");
        return;
    }
    if (paths.empty()) return;

    if (c->drag_source) {
        wl_data_source_destroy(c->drag_source);
        c->drag_source = nullptr;
    }
    c->drag_source_paths = paths;

    wl_data_source* src = wl_data_device_manager_create_data_source(c->data_device_manager);
    wl_data_source_add_listener(src, &source_listener, c);
    wl_data_source_offer(src, "text/uri-list");
    wl_data_source_offer(src, "text/plain");
    if (wl_proxy_get_version(reinterpret_cast<wl_proxy*>(src)) >= 3)
        wl_data_source_set_actions(src, WL_DATA_DEVICE_MANAGER_DND_ACTION_COPY);

    wl_data_device_start_drag(c->data_device, src, c->pointer_focus, nullptr,
                              c->last_button_serial);
    c->drag_source = src;
    wl_display_flush(c->display);
    g_printerr("[dnd] start_drag: %zu path(s), serial=%u\n", paths.size(),
               c->last_button_serial);
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
    } else if (!strcmp(iface, wl_data_device_manager_interface.name)) {
        // Version 3 for the DnD actions + finish handshake.
        c->data_device_manager = static_cast<wl_data_device_manager*>(
            wl_registry_bind(r, name, &wl_data_device_manager_interface, std::min(ver, 3u)));
        g_printerr("[dnd] bound wl_data_device_manager v%u\n", std::min(ver, 3u));
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
    setup_data_device(c);               // needs both seat + data_device_manager bound
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
        // A negative exclusive size (no edge) means "ignore other surfaces'
        // exclusive zones" — full-screen layer webviews span the whole output
        // instead of being pushed inward by the bar/dock reservations.
        if (spec.exclusive_size < 0)
            zwlr_layer_surface_v1_set_exclusive_zone(s->layer, -1);
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

void surface_set_keyboard(Surface* s, KeyboardMode mode) {
    zwlr_layer_surface_v1_set_keyboard_interactivity(s->layer, to_sctk_kb(mode));
    wl_surface_commit(s->wl);
    wl_display_flush(s->conn->display);
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
    // The surface was unmapped by surface_hide, which invalidates its configured
    // state. Commit with no buffer to elicit a fresh configure; on_render only
    // presents once `configured` is true again (set in ls_configure), so no buffer
    // is attached before the compositor reconfigures.
    wl_surface_commit(s->wl);
    wl_display_flush(s->conn->display);
    if (s->vblank) s->vblank();
}
void surface_hide(Surface* s) {
    s->visible = false;
    // Unmapping (null buffer) invalidates the layer surface's configured state:
    // wlroots sends a new configure on re-map and attaching before acking it is a
    // protocol error, so clear the flag and let on_render wait for the reconfigure.
    s->configured = false;
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

void surface_attach_blank(Surface* s) {
    WaylandConn* c = s->conn;
    int w = s->width, h = s->height;
    if (w <= 0 || h <= 0 || !c->shm) return;
    int stride = w * 4;
    int size = stride * h;
    int fd = memfd_create("neoshell-blank", MFD_CLOEXEC);
    if (fd < 0) { g_printerr("[present] memfd_create failed for blank buffer\n"); return; }
    if (ftruncate(fd, size) < 0) { close(fd); return; }   // memfd is zero-filled = transparent
    wl_shm_pool* pool = wl_shm_create_pool(c->shm, fd, size);
    wl_buffer* buffer = wl_shm_pool_create_buffer(pool, 0, w, h, stride, WL_SHM_FORMAT_ARGB8888);
    wl_shm_pool_destroy(pool);
    close(fd);
    auto* release = new std::function<void()>([]() {});
    wl_buffer_add_listener(buffer, &buffer_listener, release);   // destroys the buffer on release
    wl_surface_attach(s->wl, buffer, 0, 0);
    wl_surface_damage_buffer(s->wl, 0, 0, w, h);
    wl_surface_commit(s->wl);
    wl_display_flush(c->display);
}
