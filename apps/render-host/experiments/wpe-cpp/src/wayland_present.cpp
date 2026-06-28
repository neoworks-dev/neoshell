#include "wayland_present.h"

#include <wayland-client.h>
// The layer-shell protocol uses `namespace` as a parameter name (C++ keyword).
// Rename it across the generated C header so it compiles as C++.
#define namespace namespace_
#include "wlr-layer-shell-unstable-v1-client.h"
#undef namespace
#include "linux-dmabuf-v1-client.h"

#include <cstdio>
#include <cstring>

struct WaylandPresent {
    wl_display* display = nullptr;
    wl_registry* registry = nullptr;
    wl_compositor* compositor = nullptr;
    zwlr_layer_shell_v1* layer_shell = nullptr;
    zwp_linux_dmabuf_v1* dmabuf = nullptr;

    wl_surface* surface = nullptr;
    zwlr_layer_surface_v1* layer_surface = nullptr;
    wl_callback* frame_cb = nullptr;

    int width = 0, height = 0;
    bool configured = false;

    std::function<void()> vblank;
    // Per-in-flight wl_buffer release closure.
    std::function<void()>* pending_release = nullptr;
};

// ---- registry ----
static void reg_global(void* data, wl_registry* r, uint32_t name,
                       const char* iface, uint32_t ver) {
    auto* wp = static_cast<WaylandPresent*>(data);
    if (!strcmp(iface, wl_compositor_interface.name))
        wp->compositor = static_cast<wl_compositor*>(
            wl_registry_bind(r, name, &wl_compositor_interface, 4));
    else if (!strcmp(iface, zwlr_layer_shell_v1_interface.name))
        wp->layer_shell = static_cast<zwlr_layer_shell_v1*>(
            wl_registry_bind(r, name, &zwlr_layer_shell_v1_interface, 1));
    else if (!strcmp(iface, zwp_linux_dmabuf_v1_interface.name))
        wp->dmabuf = static_cast<zwp_linux_dmabuf_v1*>(
            wl_registry_bind(r, name, &zwp_linux_dmabuf_v1_interface, 3));
}
static void reg_remove(void*, wl_registry*, uint32_t) {}
static const wl_registry_listener registry_listener = {reg_global, reg_remove};

// ---- layer surface ----
static void ls_configure(void* data, zwlr_layer_surface_v1* ls, uint32_t serial,
                         uint32_t w, uint32_t h) {
    auto* wp = static_cast<WaylandPresent*>(data);
    zwlr_layer_surface_v1_ack_configure(ls, serial);
    wp->configured = true;
    g_printerr("[present] layer surface configured %ux%u\n", w, h);
}
static void ls_closed(void*, zwlr_layer_surface_v1*) {}
static const zwlr_layer_surface_v1_listener ls_listener = {ls_configure, ls_closed};

// ---- frame callback (vblank) ----
static void frame_done(void* data, wl_callback* cb, uint32_t);
static const wl_callback_listener frame_listener = {frame_done};
static void frame_done(void* data, wl_callback* cb, uint32_t) {
    auto* wp = static_cast<WaylandPresent*>(data);
    if (wp->frame_cb) { wl_callback_destroy(wp->frame_cb); wp->frame_cb = nullptr; }
    if (wp->vblank) wp->vblank();   // tick WPE -> produces the next frame
}

// ---- wl_buffer release ----
static void buffer_release(void* data, wl_buffer* buf) {
    auto* release = static_cast<std::function<void()>*>(data);
    if (release && *release) (*release)();
    delete release;
    wl_buffer_destroy(buf);
}
static const wl_buffer_listener buffer_listener = {buffer_release};

WaylandPresent* wayland_present_new(int width, int height) {
    auto* wp = new WaylandPresent();
    wp->width = width;
    wp->height = height;
    wp->display = wl_display_connect(nullptr);
    if (!wp->display) { g_printerr("[present] no wayland display\n"); return wp; }
    wp->registry = wl_display_get_registry(wp->display);
    wl_registry_add_listener(wp->registry, &registry_listener, wp);
    wl_display_roundtrip(wp->display);

    if (!wp->compositor || !wp->layer_shell || !wp->dmabuf) {
        g_printerr("[present] missing globals: compositor=%p layer_shell=%p dmabuf=%p\n",
                   (void*)wp->compositor, (void*)wp->layer_shell, (void*)wp->dmabuf);
        return wp;
    }

    wp->surface = wl_compositor_create_surface(wp->compositor);
    wp->layer_surface = zwlr_layer_shell_v1_get_layer_surface(
        wp->layer_shell, wp->surface, nullptr,
        ZWLR_LAYER_SHELL_V1_LAYER_OVERLAY, "neobar-wpe-spike");
    zwlr_layer_surface_v1_add_listener(wp->layer_surface, &ls_listener, wp);
    zwlr_layer_surface_v1_set_size(wp->layer_surface, width, height);
    zwlr_layer_surface_v1_set_anchor(
        wp->layer_surface,
        ZWLR_LAYER_SURFACE_V1_ANCHOR_TOP | ZWLR_LAYER_SURFACE_V1_ANCHOR_LEFT);
    wl_surface_commit(wp->surface);
    wl_display_roundtrip(wp->display);   // wait for first configure
    return wp;
}

void wayland_present_set_vblank_callback(WaylandPresent* wp, std::function<void()> cb) {
    wp->vblank = std::move(cb);
}
bool wayland_present_ready(WaylandPresent* wp) { return wp->configured; }
int wayland_present_fd(WaylandPresent* wp) { return wl_display_get_fd(wp->display); }
void wayland_present_dispatch(WaylandPresent* wp) {
    // Non-blocking: read what's pending on the fd, dispatch, then flush our
    // replies. Bare wl_display_dispatch() can block when events are produced
    // from within a dispatch (our vblank -> render -> submit chain).
    if (wl_display_prepare_read(wp->display) == 0)
        wl_display_read_events(wp->display);
    else
        wl_display_cancel_read(wp->display);
    wl_display_dispatch_pending(wp->display);
    wl_display_flush(wp->display);
}
void wayland_present_flush(WaylandPresent* wp) { wl_display_flush(wp->display); }

static bool g_logged_params = false;

void wayland_present_submit(WaylandPresent* wp, WPEBufferDMABuf* dma,
                            std::function<void()> on_release) {
    int w = wpe_buffer_get_width(WPE_BUFFER(dma));
    int h = wpe_buffer_get_height(WPE_BUFFER(dma));
    uint32_t fourcc = wpe_buffer_dma_buf_get_format(dma);
    uint64_t mod = wpe_buffer_dma_buf_get_modifier(dma);
    uint32_t n_planes = wpe_buffer_dma_buf_get_n_planes(dma);

    zwp_linux_buffer_params_v1* params = zwp_linux_dmabuf_v1_create_params(wp->dmabuf);
    for (uint32_t i = 0; i < n_planes; i++) {
        int fd = wpe_buffer_dma_buf_get_fd(dma, i);
        uint32_t off = wpe_buffer_dma_buf_get_offset(dma, i);
        uint32_t stride = wpe_buffer_dma_buf_get_stride(dma, i);
        zwp_linux_buffer_params_v1_add(params, fd, i, off, stride,
                                       mod >> 32, mod & 0xffffffff);
        if (!g_logged_params)
            g_printerr("[present] plane%u fd=%d off=%u stride=%u  %dx%d fourcc=0x%08x "
                       "mod=0x%llx\n", i, fd, off, stride, w, h, fourcc,
                       (unsigned long long)mod);
    }
    g_logged_params = true;

    // Synchronous import (no server roundtrip): fast path now that we render on
    // the compositor's GPU with a linear modifier.
    wl_buffer* buffer = zwp_linux_buffer_params_v1_create_immed(params, w, h, fourcc, 0);
    zwp_linux_buffer_params_v1_destroy(params);
    if (!buffer) {
        if (on_release) on_release();
        return;
    }
    auto* release = new std::function<void()>(std::move(on_release));
    wl_buffer_add_listener(buffer, &buffer_listener, release);

    wp->frame_cb = wl_surface_frame(wp->surface);
    wl_callback_add_listener(wp->frame_cb, &frame_listener, wp);
    wl_surface_attach(wp->surface, buffer, 0, 0);
    wl_surface_damage_buffer(wp->surface, 0, 0, w, h);
    wl_surface_commit(wp->surface);
    wl_display_flush(wp->display);
}
