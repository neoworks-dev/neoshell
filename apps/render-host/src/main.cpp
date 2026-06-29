// neoshell render-host (C++/WPE). Multi-surface: one wlr-layer-shell surface per
// role, each backed by an off-screen WebKitWebView whose frames arrive as
// zero-copy dmabufs and are presented at the compositor's vblank. Driven by the
// Go core over a unix-socket JSON protocol (control.h).
#include "wpe_backend.h"
#include "present.h"
#include "control.h"

#include <wpe/webkit.h>
#include <glib.h>
#include <glib-unix.h>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <map>
#include <memory>
#include <string>

namespace {
const char* FEATURE_60FPS = "PreferPageRenderingUpdatesNear60FPS";

struct Surf {
    std::string role;
    std::string url;
    Surface* surface = nullptr;
    WPEDisplay* display = nullptr;   // the GPU display driving this surface's output
    WebKitWebView* webview = nullptr;
    WPEView* wpe_view = nullptr;
    WPEToplevel* toplevel = nullptr;
    bool wired = false;          // toplevel mapped + page loaded
    bool ready_emitted = false;
    // In-flight buffer-release lambdas capture this; cleared on destroy so a
    // late wl_buffer.release doesn't touch a freed view.
    std::shared_ptr<bool> alive = std::make_shared<bool>(true);
};

struct Host {
    WaylandConn* conn = nullptr;
    Control* control = nullptr;
    std::map<std::string, WPEDisplay*> displays;   // keyed by render node path
    std::map<std::string, Surf*> by_role;
    std::map<WPEView*, Surf*> by_view;
    std::map<wl_surface*, Surf*> by_wl;
    gint64 last_present_us = 0;
};
Host g_host;
void on_render(WPEView* view, WPEBuffer* buffer, const WPERectangle*, guint);

// Keep ticking for a short window after any input so input-driven repaints
// (CSS :hover, focus rings, …) render promptly even when the page is otherwise
// idle and WebKit has stopped its sync observer.
gint64 g_input_active_until = 0;
void wake_for_input() { g_input_active_until = g_get_monotonic_time() + 300000; }  // 300ms

// All surfaces render on the compositor's GPU (it composites there and scans out
// to other GPUs' connectors); cross-GPU buffers are rejected. Resolved from
// dmabuf-feedback main_device, with env override and an AMD-ish fallback.
struct GpuNodes { std::string primary, render; };
GpuNodes compositor_gpu() {
    GpuNodes g;
    if (getenv("NEOSHELL_RENDER_NODE")) {
        g.render = getenv("NEOSHELL_RENDER_NODE");
        g.primary = getenv("NEOSHELL_PRIMARY_NODE") ? getenv("NEOSHELL_PRIMARY_NODE") : g.render;
        return g;
    }
    g.render = conn_render_node(g_host.conn);
    g.primary = conn_primary_node(g_host.conn);
    if (g.render.empty()) { g.render = "/dev/dri/renderD128"; }  // last-resort
    if (g.primary.empty()) g.primary = g.render;
    return g;
}

// Lazily create + connect the WPE display for the compositor's render node.
WPEDisplay* get_display(const GpuNodes& gpu) {
    auto it = g_host.displays.find(gpu.render);
    if (it != g_host.displays.end()) return it->second;
    WPEDisplay* d = neoshell_display_new(gpu.primary.c_str(), gpu.render.c_str(),
                                       1920, 1080, 144000);
    GError* err = nullptr;
    if (!wpe_display_connect(d, &err)) {
        g_printerr("[neoshell-wpe] WPE connect failed for %s: %s\n", gpu.render.c_str(),
                   err ? err->message : "?");
        return nullptr;
    }
    neoshell_display_set_render_callback(d, on_render);
    // Apply WebKit-requested cursors to the shared seat pointer.
    neoshell_display_set_cursor_callback(d, [](WPEView*, const char* name) {
        present_set_cursor(g_host.conn, name);
    });
    g_host.displays[gpu.render] = d;
    g_printerr("[neoshell-wpe] created display for render node %s\n", gpu.render.c_str());
    return d;
}

WPEView* view_for_wl(wl_surface* w) {
    auto it = g_host.by_wl.find(w);
    return it == g_host.by_wl.end() ? nullptr : it->second->wpe_view;
}
guint wpe_button(uint32_t code) {
    switch (code) {
        case 0x110: return 1;  // BTN_LEFT
        case 0x112: return 2;  // BTN_MIDDLE
        case 0x111: return 3;  // BTN_RIGHT
        default: return 0;
    }
}
void install_input() {
    InputSink sink;
    auto move = [](wl_surface* w, double x, double y, WPEEventType type) {
        wake_for_input();
        WPEView* v = view_for_wl(w);
        if (!v) return;
        WPEEvent* e = wpe_event_pointer_move_new(type, v, WPE_INPUT_SOURCE_MOUSE, 0,
                                                 (WPEModifiers)0, x, y, 0, 0);
        wpe_view_event(v, e); wpe_event_unref(e);
    };
    sink.pointer_enter = [move](wl_surface* w, double x, double y) {
        if (getenv("NEOSHELL_INPUT_DEBUG"))
            g_printerr("[input] pointer enter %.0f,%.0f\n", x, y);
        move(w, x, y, WPE_EVENT_POINTER_ENTER);
    };
    sink.pointer_leave = [move](wl_surface* w, double x, double y) {
        move(w, x, y, WPE_EVENT_POINTER_LEAVE);
    };
    sink.pointer_motion = [move](wl_surface* w, double x, double y) {
        move(w, x, y, WPE_EVENT_POINTER_MOVE);
    };
    sink.pointer_button = [](wl_surface* w, double x, double y, uint32_t button, bool pressed) {
        wake_for_input();
        if (getenv("NEOSHELL_INPUT_DEBUG"))
            g_printerr("[input] button %u %s at %.0f,%.0f\n", button,
                       pressed ? "down" : "up", x, y);
        WPEView* v = view_for_wl(w);
        guint b = wpe_button(button);
        if (!v || !b) return;
        WPEEvent* e = wpe_event_pointer_button_new(
            pressed ? WPE_EVENT_POINTER_DOWN : WPE_EVENT_POINTER_UP, v,
            WPE_INPUT_SOURCE_MOUSE, 0, (WPEModifiers)0, b, x, y, pressed ? 1 : 0);
        wpe_view_event(v, e); wpe_event_unref(e);
    };
    sink.pointer_axis = [](wl_surface* w, double x, double y, double dx, double dy) {
        wake_for_input();
        WPEView* v = view_for_wl(w);
        if (!v) return;
        WPEEvent* e = wpe_event_scroll_new(v, WPE_INPUT_SOURCE_MOUSE, 0, (WPEModifiers)0,
                                           dx, dy, TRUE, FALSE, x, y);
        wpe_view_event(v, e); wpe_event_unref(e);
    };
    sink.key = [](wl_surface* w, uint32_t keycode, uint32_t keysym, bool pressed) {
        wake_for_input();
        WPEView* v = view_for_wl(w);
        if (!v) return;
        WPEEvent* e = wpe_event_keyboard_new(
            pressed ? WPE_EVENT_KEYBOARD_KEY_DOWN : WPE_EVENT_KEYBOARD_KEY_UP, v,
            WPE_INPUT_SOURCE_KEYBOARD, 0, (WPEModifiers)0, keycode, keysym);
        wpe_view_event(v, e); wpe_event_unref(e);
    };
    conn_set_input(g_host.conn, std::move(sink));
}

void set_60fps_feature(WebKitSettings* settings, bool enabled) {
    WebKitFeatureList* features = webkit_settings_get_all_features();
    for (gsize i = 0; i < webkit_feature_list_get_length(features); i++) {
        WebKitFeature* f = webkit_feature_list_get(features, i);
        if (g_strcmp0(webkit_feature_get_identifier(f), FEATURE_60FPS) == 0) {
            webkit_settings_set_feature_enabled(settings, f, enabled);
            break;
        }
    }
    webkit_feature_list_unref(features);
}

// WPE evaluates the interaction media features as a touch device: `(hover: hover)`
// and `(pointer: fine)` are false (it has no notion of a desktop mouse). Tailwind's
// `hover:` variant compiles to `@media (hover: hover){...}`, so every hover style is
// silently dropped even though our injected pointer events still fire JS handlers.
//
// This document-start user script neutralizes that gate at the source: it rewrites
// matching `@media` conditions in every stylesheet to always-true and overrides
// `matchMedia` so JS that probes hover/pointer agrees. A MutationObserver re-runs the
// rewrite for stylesheets added later (Vite HMR injects <style> after load). Injected
// by the host so it covers both dev (Vite) and prod (Go server) without per-server logic.
const char* HOVER_FIX_SCRIPT = R"JS(
(function () {
  var interactionQuery = /\((any-)?hover\s*:\s*hover\)|\((any-)?pointer\s*:\s*fine\)/;

  if (window.matchMedia) {
    var originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = function (query) {
      if (interactionQuery.test(query)) {
        return {
          matches: true, media: query, onchange: null,
          addEventListener: function () {}, removeEventListener: function () {},
          addListener: function () {}, removeListener: function () {},
          dispatchEvent: function () { return false; },
        };
      }
      return originalMatchMedia(query);
    };
  }

  function ungateRules(rules) {
    if (!rules) return;
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.media && interactionQuery.test(rule.media.mediaText)) {
        try { rule.media.mediaText = "all"; } catch (e) {}
      }
      if (rule.cssRules) ungateRules(rule.cssRules);  // nested @supports/@layer
    }
  }
  function ungateHoverMedia() {
    var sheets = document.styleSheets;
    for (var s = 0; s < sheets.length; s++) {
      var rules;
      try { rules = sheets[s].cssRules; } catch (e) { continue; }
      ungateRules(rules);
    }
  }

  function schedule() { try { ungateHoverMedia(); } catch (e) {} }
  document.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("load", schedule);

  // Re-ungate when stylesheets are added/changed (Vite HMR, dynamic <style>).
  function observe() {
    var target = document.documentElement || document;
    var observer = new MutationObserver(function () { schedule(); });
    observer.observe(target, { childList: true, subtree: true });
  }
  if (document.documentElement) observe();
  else document.addEventListener("DOMContentLoaded", observe);
})();
)JS";

// Build a content manager that injects the hover-fix script at document start.
WebKitUserContentManager* make_user_content_manager() {
    WebKitUserContentManager* manager = webkit_user_content_manager_new();
    WebKitUserScript* script = webkit_user_script_new(
        HOVER_FIX_SCRIPT,
        WEBKIT_USER_CONTENT_INJECT_ALL_FRAMES,
        WEBKIT_USER_SCRIPT_INJECT_AT_DOCUMENT_START,
        nullptr, nullptr);
    webkit_user_content_manager_add_script(manager, script);
    webkit_user_script_unref(script);
    return manager;
}

// Reload context carried through the GLib timeout. Holds the surface's `alive`
// flag so a reload scheduled before destroy doesn't touch a freed webview.
struct ReloadCtx {
    Surf* surf;
    std::shared_ptr<bool> alive;
};

gboolean reload_surface(gpointer data) {
    auto* ctx = static_cast<ReloadCtx*>(data);
    if (*ctx->alive) {
        webkit_web_view_load_uri(ctx->surf->webview, ctx->surf->url.c_str());
    }
    delete ctx;
    return G_SOURCE_REMOVE;
}

// Retry on a failed load so the surface recovers when the page becomes reachable
// — chiefly the dev server not yet listening at startup or a Vite HMR restart.
// Cancelled loads (superseded by a newer navigation) are left alone.
gboolean on_load_failed(WebKitWebView*, WebKitLoadEvent, const char* uri,
                        GError* error, gpointer user) {
    if (error && g_error_matches(error, WEBKIT_NETWORK_ERROR, WEBKIT_NETWORK_ERROR_CANCELLED)) {
        return FALSE;
    }
    Surf* s = static_cast<Surf*>(user);
    control_emit_log(g_host.control, "load-failed", error ? error->message : uri);
    g_timeout_add(500, reload_surface, new ReloadCtx{s, s->alive});
    return TRUE;  // suppress WebKit's default error page; we retry instead
}

// First configure: size the WPE view, map it, load the page. Later configures
// just resize. Emits `ready` once.
void on_surface_configured(Surf* s, int w, int h) {
    if (w <= 0 || h <= 0) return;
    wpe_toplevel_resized(s->toplevel, w, h);
    wpe_view_resized(s->wpe_view, w, h);
    if (!s->wired) {
        wpe_view_set_visible(s->wpe_view, TRUE);
        wpe_view_map(s->wpe_view);
        webkit_web_view_load_uri(s->webview, s->url.c_str());
        s->wired = true;
    }
    if (!s->ready_emitted) {
        control_emit_ready(g_host.control, s->role);
        s->ready_emitted = true;
    }
}

void on_render(WPEView* view, WPEBuffer* buffer, const WPERectangle*, guint) {
    auto it = g_host.by_view.find(view);
    if (it == g_host.by_view.end()) { return; }
    Surf* s = it->second;
    if (!surface_configured(s->surface) || !WPE_IS_BUFFER_DMA_BUF(buffer)) {
        wpe_view_buffer_rendered(view, buffer);
        wpe_view_buffer_released(view, buffer);
        return;
    }
    wpe_view_buffer_rendered(view, buffer);
    g_host.last_present_us = g_get_monotonic_time();
    auto alive = s->alive;
    surface_submit(s->surface, WPE_BUFFER_DMA_BUF(buffer),
                   [alive, view, buffer]() {
                       if (*alive) wpe_view_buffer_released(view, buffer);
                   });
}

// ---- control handler ----
void handle_create(const SurfaceSpec& spec, const std::string& url) {
    if (g_host.by_role.count(spec.role)) return;
    auto* s = new Surf();
    s->role = spec.role;
    s->url = url;
    s->surface = surface_create(g_host.conn, spec);

    // Render on the compositor's GPU (works for any output).
    s->display = get_display(compositor_gpu());
    if (!s->display) { surface_destroy(s->surface); delete s; return; }

    WebKitUserContentManager* content = make_user_content_manager();
    s->webview = WEBKIT_WEB_VIEW(g_object_new(webkit_web_view_get_type(),
                                              "display", s->display,
                                              "user-content-manager", content, nullptr));
    g_object_unref(content);  // webview holds its own ref
    // Transparent background so unpainted areas of a fullscreen overlay (e.g. the
    // bar) show the desktop through; also makes WPE produce an ARGB (alpha) buffer.
    WebKitColor transparent = {0.0, 0.0, 0.0, 0.0};
    webkit_web_view_set_background_color(s->webview, &transparent);
    bool cap60 = getenv("NEOSHELL_60FPS") != nullptr;
    set_60fps_feature(webkit_web_view_get_settings(s->webview), cap60);
    s->wpe_view = webkit_web_view_get_wpe_view(s->webview);
    g_signal_connect(s->webview, "load-failed", G_CALLBACK(on_load_failed), s);
    if (getenv("NEOSHELL_LOG_TITLE"))
        g_signal_connect(s->webview, "notify::title",
                         G_CALLBACK(+[](GObject* o, GParamSpec*, gpointer) {
                             const char* t = webkit_web_view_get_title(WEBKIT_WEB_VIEW(o));
                             if (t && *t) control_emit_log(g_host.control, "title", t);
                         }),
                         nullptr);
    s->toplevel = wpe_display_create_toplevel(s->display, 1);
    wpe_view_set_toplevel(s->wpe_view, s->toplevel);

    surface_set_configure_cb(s->surface, [s](int w, int h) { on_surface_configured(s, w, h); });
    WPEDisplay* d = s->display;
    surface_set_vblank_cb(s->surface, [d]() { neoshell_display_tick_vblank(d); });

    g_host.by_role[spec.role] = s;
    g_host.by_view[s->wpe_view] = s;
    g_host.by_wl[surface_wl(s->surface)] = s;
    g_printerr("[neoshell-wpe] surface.create role=%s url=%s\n", spec.role.c_str(), url.c_str());
}
Surf* find(const std::string& role) {
    auto it = g_host.by_role.find(role);
    return it == g_host.by_role.end() ? nullptr : it->second;
}
void handle_exclusive(const std::string& role, EdgeKind edge, int size) {
    if (Surf* s = find(role)) surface_set_exclusive(s->surface, edge, size);
}
void handle_region(const std::string& role, const std::vector<Rect>& rects) {
    if (Surf* s = find(role)) surface_set_region(s->surface, rects);
}
void handle_show(const std::string& role) { if (Surf* s = find(role)) surface_show(s->surface); }
void handle_hide(const std::string& role) { if (Surf* s = find(role)) surface_hide(s->surface); }
void handle_destroy(const std::string& role) {
    Surf* s = find(role);
    if (!s) return;
    *s->alive = false;   // late buffer releases become no-ops
    g_host.by_view.erase(s->wpe_view);
    g_host.by_wl.erase(surface_wl(s->surface));
    g_host.by_role.erase(role);
    if (s->webview) g_object_unref(s->webview);
    surface_destroy(s->surface);
    delete s;
}

// ---- GLib fd integration ----
gboolean on_wayland_readable(gint, GIOCondition, gpointer) {
    conn_dispatch(g_host.conn);
    return G_SOURCE_CONTINUE;
}
gboolean on_client_readable(gint, GIOCondition, gpointer) {
    return control_read(g_host.control) ? G_SOURCE_CONTINUE : G_SOURCE_REMOVE;
}
gboolean on_listen_readable(gint, GIOCondition, gpointer) {
    int fd = control_accept(g_host.control);
    if (fd >= 0) g_unix_fd_add(fd, G_IO_IN, on_client_readable, nullptr);
    return G_SOURCE_CONTINUE;
}
// Tick every display whose page wants to render (WebKit started its observer).
// This drives input-driven repaints (CSS :hover etc.) promptly and bootstraps
// the first frame, while staying idle (no ticks) when every page is quiescent.
gboolean watchdog(gpointer) {
    bool input_window = g_get_monotonic_time() < g_input_active_until;
    for (auto& [node, d] : g_host.displays)
        if (input_window || neoshell_display_observer_active(d))
            neoshell_display_tick_vblank(d);
    return G_SOURCE_CONTINUE;
}
}  // namespace

int main(int argc, char** argv) {
    g_host.conn = conn_new();
    if (!conn_ok(g_host.conn)) {
        g_printerr("[neoshell-wpe] wayland connection failed\n");
        return 1;
    }
    // WPE displays are created lazily per output GPU as surfaces are created.
    install_input();

    ControlHandler handler;
    handler.on_create = handle_create;
    handler.on_exclusive = handle_exclusive;
    handler.on_region = handle_region;
    handler.on_show = handle_show;
    handler.on_hide = handle_hide;
    handler.on_destroy = handle_destroy;
    g_host.control = control_new(std::move(handler));
    if (control_listen_fd(g_host.control) < 0) return 1;

    g_unix_fd_add(conn_fd(g_host.conn), G_IO_IN, on_wayland_readable, nullptr);
    g_unix_fd_add(control_listen_fd(g_host.control), G_IO_IN, on_listen_readable, nullptr);
    g_timeout_add(16, watchdog, nullptr);

    GMainLoop* loop = g_main_loop_new(nullptr, FALSE);
    g_printerr("[neoshell-wpe] ready (per-output GPU selection)\n");
    g_main_loop_run(loop);
    return 0;
}
