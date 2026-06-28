#include "wpe_backend.h"

#include <gbm.h>
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <drm_fourcc.h>
#include <fcntl.h>
#include <unistd.h>
#include <cstdio>

// ----------------------------------------------------------------------------
// Sync observer: we drive it. start/stop just flag whether WebKit wants frames;
// tick() invokes the base "sync" vfunc, which fires the registered callbacks.
// ----------------------------------------------------------------------------
#define NEOSHELL_TYPE_SYNC_OBSERVER (neoshell_sync_observer_get_type())
G_DECLARE_FINAL_TYPE(NeoshellSyncObserver, neoshell_sync_observer, NEOSHELL, SYNC_OBSERVER,
                     WPEScreenSyncObserver)
struct _NeoshellSyncObserver {
    WPEScreenSyncObserver parent;
    gboolean active;
};
G_DEFINE_TYPE(NeoshellSyncObserver, neoshell_sync_observer, WPE_TYPE_SCREEN_SYNC_OBSERVER)

static void neoshell_sync_observer_start(WPEScreenSyncObserver* obs) {
    NEOSHELL_SYNC_OBSERVER(obs)->active = TRUE;
}
static void neoshell_sync_observer_stop(WPEScreenSyncObserver* obs) {
    NEOSHELL_SYNC_OBSERVER(obs)->active = FALSE;
}
static void neoshell_sync_observer_init(NeoshellSyncObserver*) {}
static void neoshell_sync_observer_class_init(NeoshellSyncObserverClass* klass) {
    auto* oc = WPE_SCREEN_SYNC_OBSERVER_CLASS(klass);
    oc->start = neoshell_sync_observer_start;
    oc->stop = neoshell_sync_observer_stop;
    // Leave `sync` as the inherited base impl: it fires registered callbacks.
}

// ----------------------------------------------------------------------------
// Screen: owns one sync observer.
// ----------------------------------------------------------------------------
#define NEOSHELL_TYPE_SCREEN (neoshell_screen_get_type())
G_DECLARE_FINAL_TYPE(NeoshellScreen, neoshell_screen, NEOSHELL, SCREEN, WPEScreen)
struct _NeoshellScreen {
    WPEScreen parent;
    NeoshellSyncObserver* observer;
};
G_DEFINE_TYPE(NeoshellScreen, neoshell_screen, WPE_TYPE_SCREEN)

static WPEScreenSyncObserver* neoshell_screen_get_sync_observer(WPEScreen* screen) {
    auto* self = NEOSHELL_SCREEN(screen);
    if (!self->observer)
        self->observer = NEOSHELL_SYNC_OBSERVER(g_object_new(NEOSHELL_TYPE_SYNC_OBSERVER, nullptr));
    return WPE_SCREEN_SYNC_OBSERVER(self->observer);
}
static void neoshell_screen_invalidate(WPEScreen*) {}
static void neoshell_screen_init(NeoshellScreen*) {}
static void neoshell_screen_class_init(NeoshellScreenClass* klass) {
    auto* sc = WPE_SCREEN_CLASS(klass);
    sc->get_sync_observer = neoshell_screen_get_sync_observer;
    sc->invalidate = neoshell_screen_invalidate;
}

// ----------------------------------------------------------------------------
// Toplevel: trivial; reports the display's screen and accepts resizes.
// ----------------------------------------------------------------------------
#define NEOSHELL_TYPE_TOPLEVEL (neoshell_toplevel_get_type())
G_DECLARE_FINAL_TYPE(NeoshellToplevel, neoshell_toplevel, NEOSHELL, TOPLEVEL, WPEToplevel)
struct _NeoshellToplevel {
    WPEToplevel parent;
};
G_DEFINE_TYPE(NeoshellToplevel, neoshell_toplevel, WPE_TYPE_TOPLEVEL)

static WPEScreen* neoshell_toplevel_get_screen(WPEToplevel* toplevel) {
    WPEDisplay* display = wpe_toplevel_get_display(toplevel);
    return wpe_display_get_screen(display, 0);
}
static gboolean neoshell_toplevel_resize(WPEToplevel*, int, int) { return TRUE; }
static void neoshell_toplevel_set_title(WPEToplevel*, const char*) {}

// Build a LINEAR-only rendering format set so the compositor can import the
// resulting dmabuf (a driver-chosen tiled modifier failed to import).
static WPEBufferFormats* neoshell_linear_formats(WPEDisplay* display) {
    WPEDRMDevice* dev = wpe_display_get_drm_device(display);
    WPEBufferFormatsBuilder* b = wpe_buffer_formats_builder_new(dev);
    wpe_buffer_formats_builder_append_group(b, dev, WPE_BUFFER_FORMAT_USAGE_RENDERING);
    wpe_buffer_formats_builder_append_format(b, DRM_FORMAT_ARGB8888, DRM_FORMAT_MOD_LINEAR);
    wpe_buffer_formats_builder_append_format(b, DRM_FORMAT_XRGB8888, DRM_FORMAT_MOD_LINEAR);
    return wpe_buffer_formats_builder_end(b);
}
static WPEBufferFormats* neoshell_toplevel_get_preferred_buffer_formats(WPEToplevel* toplevel) {
    // Default: let WPE pick the GPU-optimal (tiled/compressed) modifier — cheap
    // to render and importable on the same GPU. Set NEOSHELL_LINEAR=1 to force
    // LINEAR (needed only for a cross-GPU handoff).
    if (!getenv("NEOSHELL_LINEAR"))
        return nullptr;
    return neoshell_linear_formats(wpe_toplevel_get_display(toplevel));
}
static void neoshell_toplevel_init(NeoshellToplevel*) {}
static void neoshell_toplevel_class_init(NeoshellToplevelClass* klass) {
    auto* tc = WPE_TOPLEVEL_CLASS(klass);
    tc->get_screen = neoshell_toplevel_get_screen;
    tc->resize = neoshell_toplevel_resize;
    tc->set_title = neoshell_toplevel_set_title;
    tc->get_preferred_buffer_formats = neoshell_toplevel_get_preferred_buffer_formats;
}

// ----------------------------------------------------------------------------
// View: delivers each rendered buffer to the host callback.
// ----------------------------------------------------------------------------
#define NEOSHELL_TYPE_VIEW (neoshell_view_get_type())
G_DECLARE_FINAL_TYPE(NeoshellView, neoshell_view, NEOSHELL, VIEW, WPEView)
struct _NeoshellView {
    WPEView parent;
};
G_DEFINE_TYPE(NeoshellView, neoshell_view, WPE_TYPE_VIEW)

// Forward decl: fetch the host render callback stored on the display.
static RenderCallback* neoshell_display_render_cb(WPEDisplay*);

static gboolean neoshell_view_render_buffer(WPEView* view, WPEBuffer* buffer,
                                          const WPERectangle* damage, guint n_damage,
                                          GError** error) {
    RenderCallback* cb = neoshell_display_render_cb(wpe_view_get_display(view));
    if (cb && *cb)
        (*cb)(view, buffer, damage, n_damage);
    else
        wpe_view_buffer_rendered(view, buffer);
    return TRUE;
}
static gboolean neoshell_view_can_be_mapped(WPEView*) { return TRUE; }
static void neoshell_view_init(NeoshellView*) {}
static void neoshell_view_class_init(NeoshellViewClass* klass) {
    auto* vc = WPE_VIEW_CLASS(klass);
    vc->render_buffer = neoshell_view_render_buffer;
    vc->can_be_mapped = neoshell_view_can_be_mapped;
}

// ----------------------------------------------------------------------------
// Display: the backend root. Owns EGL/GBM, the screen, and the host callback.
// ----------------------------------------------------------------------------
#define NEOSHELL_TYPE_DISPLAY (neoshell_display_get_type())
G_DECLARE_FINAL_TYPE(NeoshellDisplay, neoshell_display, NEOSHELL, DISPLAY, WPEDisplay)
struct _NeoshellDisplay {
    WPEDisplay parent;
    int drm_fd;
    struct gbm_device* gbm;
    EGLDisplay egl;
    WPEDRMDevice* drm_device;
    NeoshellScreen* screen;
    RenderCallback* render_cb;
    // seed values
    char* primary_node;
    char* render_node;
    int width, height, refresh_mhz;
};
G_DEFINE_TYPE(NeoshellDisplay, neoshell_display, WPE_TYPE_DISPLAY)

static RenderCallback* neoshell_display_render_cb(WPEDisplay* display) {
    return NEOSHELL_DISPLAY(display)->render_cb;
}

static gboolean neoshell_display_connect(WPEDisplay* display, GError** error) {
    auto* self = NEOSHELL_DISPLAY(display);

    self->drm_fd = open(self->render_node, O_RDWR | O_CLOEXEC);
    if (self->drm_fd < 0) {
        g_set_error(error, WPE_DISPLAY_ERROR, 0, "open(%s) failed", self->render_node);
        return FALSE;
    }
    self->gbm = gbm_create_device(self->drm_fd);
    if (!self->gbm) {
        g_set_error(error, WPE_DISPLAY_ERROR, 0, "gbm_create_device failed");
        return FALSE;
    }
    self->egl = eglGetPlatformDisplay(EGL_PLATFORM_GBM_KHR, self->gbm, nullptr);
    if (self->egl == EGL_NO_DISPLAY || !eglInitialize(self->egl, nullptr, nullptr)) {
        g_set_error(error, WPE_DISPLAY_ERROR, 0, "eglInitialize failed");
        return FALSE;
    }

    self->drm_device = wpe_drm_device_new(self->primary_node, self->render_node);
    self->screen = NEOSHELL_SCREEN(g_object_new(NEOSHELL_TYPE_SCREEN, "id", (guint)1, nullptr));
    wpe_screen_set_size(WPE_SCREEN(self->screen), self->width, self->height);
    wpe_screen_set_refresh_rate(WPE_SCREEN(self->screen), self->refresh_mhz);

    g_printerr("[neoshell-wpe] display connected: egl=%p drm=%s %dx%d@%dmHz\n",
               self->egl, self->render_node, self->width, self->height, self->refresh_mhz);
    return TRUE;
}

static gpointer neoshell_display_get_egl_display(WPEDisplay* display, GError**) {
    return NEOSHELL_DISPLAY(display)->egl;
}
static guint neoshell_display_get_n_screens(WPEDisplay*) { return 1; }
static WPEScreen* neoshell_display_get_screen(WPEDisplay* display, guint index) {
    return WPE_SCREEN(NEOSHELL_DISPLAY(display)->screen);
}
static WPEDRMDevice* neoshell_display_get_drm_device(WPEDisplay* display) {
    return NEOSHELL_DISPLAY(display)->drm_device;
}
static gboolean neoshell_display_use_explicit_sync(WPEDisplay*) { return FALSE; }

static WPEView* neoshell_display_create_view(WPEDisplay* display) {
    // One view per surface; the host maps each WPEView back to its Surface via
    // the render callback (which receives the view).
    return WPE_VIEW(g_object_new(NEOSHELL_TYPE_VIEW, "display", display, nullptr));
}
static WPEToplevel* neoshell_display_create_toplevel(WPEDisplay* display, guint max_views) {
    return WPE_TOPLEVEL(g_object_new(NEOSHELL_TYPE_TOPLEVEL, "display", display,
                                     "max-views", max_views, nullptr));
}
static WPEBufferFormats* neoshell_display_get_preferred_buffer_formats(WPEDisplay* display) {
    if (!getenv("NEOSHELL_LINEAR"))
        return nullptr;  // let WPE pick GPU-optimal (tiled) modifiers
    return neoshell_linear_formats(display);
}

static void neoshell_display_finalize(GObject* object) {
    auto* self = NEOSHELL_DISPLAY(object);
    delete self->render_cb;
    g_free(self->primary_node);
    g_free(self->render_node);
    if (self->egl != EGL_NO_DISPLAY) eglTerminate(self->egl);
    if (self->gbm) gbm_device_destroy(self->gbm);
    if (self->drm_fd >= 0) close(self->drm_fd);
    G_OBJECT_CLASS(neoshell_display_parent_class)->finalize(object);
}
static void neoshell_display_init(NeoshellDisplay* self) {
    self->drm_fd = -1;
    self->egl = EGL_NO_DISPLAY;
    self->render_cb = new RenderCallback();
}
static void neoshell_display_class_init(NeoshellDisplayClass* klass) {
    G_OBJECT_CLASS(klass)->finalize = neoshell_display_finalize;
    auto* dc = WPE_DISPLAY_CLASS(klass);
    dc->connect = neoshell_display_connect;
    dc->get_egl_display = neoshell_display_get_egl_display;
    dc->get_n_screens = neoshell_display_get_n_screens;
    dc->get_screen = neoshell_display_get_screen;
    dc->get_drm_device = neoshell_display_get_drm_device;
    dc->use_explicit_sync = neoshell_display_use_explicit_sync;
    dc->create_view = neoshell_display_create_view;
    dc->create_toplevel = neoshell_display_create_toplevel;
    dc->get_preferred_buffer_formats = neoshell_display_get_preferred_buffer_formats;
}

// ----------------------------------------------------------------------------
// Public C++ API
// ----------------------------------------------------------------------------
WPEDisplay* neoshell_display_new(const char* primary_node, const char* render_node,
                               int width, int height, int refresh_mhz) {
    auto* self = NEOSHELL_DISPLAY(g_object_new(NEOSHELL_TYPE_DISPLAY, nullptr));
    self->primary_node = g_strdup(primary_node);
    self->render_node = g_strdup(render_node);
    self->width = width;
    self->height = height;
    self->refresh_mhz = refresh_mhz;
    return WPE_DISPLAY(self);
}

void neoshell_display_set_render_callback(WPEDisplay* display, RenderCallback cb) {
    *NEOSHELL_DISPLAY(display)->render_cb = std::move(cb);
}

bool neoshell_display_tick_vblank(WPEDisplay* display) {
    auto* self = NEOSHELL_DISPLAY(display);
    if (!self->screen) return false;
    auto* obs = NEOSHELL_SYNC_OBSERVER(neoshell_screen_get_sync_observer(WPE_SCREEN(self->screen)));
    // Fire the registered callback even if WebKit "stopped" the observer: a
    // one-shot input-driven repaint (e.g. CSS :hover) needs a sync to run and
    // present, but WebKit does not reliably restart the observer for it.
    auto* oc = WPE_SCREEN_SYNC_OBSERVER_GET_CLASS(obs);
    if (oc->sync) oc->sync(WPE_SCREEN_SYNC_OBSERVER(obs));
    return obs->active;
}

bool neoshell_display_observer_active(WPEDisplay* display) {
    auto* self = NEOSHELL_DISPLAY(display);
    if (!self->screen) return false;
    auto* obs = NEOSHELL_SYNC_OBSERVER(neoshell_screen_get_sync_observer(WPE_SCREEN(self->screen)));
    return obs->active;
}

