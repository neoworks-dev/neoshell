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
#define NEOBAR_TYPE_SYNC_OBSERVER (neobar_sync_observer_get_type())
G_DECLARE_FINAL_TYPE(NeobarSyncObserver, neobar_sync_observer, NEOBAR, SYNC_OBSERVER,
                     WPEScreenSyncObserver)
struct _NeobarSyncObserver {
    WPEScreenSyncObserver parent;
    gboolean active;
};
G_DEFINE_TYPE(NeobarSyncObserver, neobar_sync_observer, WPE_TYPE_SCREEN_SYNC_OBSERVER)

static void neobar_sync_observer_start(WPEScreenSyncObserver* obs) {
    NEOBAR_SYNC_OBSERVER(obs)->active = TRUE;
}
static void neobar_sync_observer_stop(WPEScreenSyncObserver* obs) {
    NEOBAR_SYNC_OBSERVER(obs)->active = FALSE;
}
static void neobar_sync_observer_init(NeobarSyncObserver*) {}
static void neobar_sync_observer_class_init(NeobarSyncObserverClass* klass) {
    auto* oc = WPE_SCREEN_SYNC_OBSERVER_CLASS(klass);
    oc->start = neobar_sync_observer_start;
    oc->stop = neobar_sync_observer_stop;
    // Leave `sync` as the inherited base impl: it fires registered callbacks.
}

// ----------------------------------------------------------------------------
// Screen: owns one sync observer.
// ----------------------------------------------------------------------------
#define NEOBAR_TYPE_SCREEN (neobar_screen_get_type())
G_DECLARE_FINAL_TYPE(NeobarScreen, neobar_screen, NEOBAR, SCREEN, WPEScreen)
struct _NeobarScreen {
    WPEScreen parent;
    NeobarSyncObserver* observer;
};
G_DEFINE_TYPE(NeobarScreen, neobar_screen, WPE_TYPE_SCREEN)

static WPEScreenSyncObserver* neobar_screen_get_sync_observer(WPEScreen* screen) {
    auto* self = NEOBAR_SCREEN(screen);
    if (!self->observer)
        self->observer = NEOBAR_SYNC_OBSERVER(g_object_new(NEOBAR_TYPE_SYNC_OBSERVER, nullptr));
    return WPE_SCREEN_SYNC_OBSERVER(self->observer);
}
static void neobar_screen_invalidate(WPEScreen*) {}
static void neobar_screen_init(NeobarScreen*) {}
static void neobar_screen_class_init(NeobarScreenClass* klass) {
    auto* sc = WPE_SCREEN_CLASS(klass);
    sc->get_sync_observer = neobar_screen_get_sync_observer;
    sc->invalidate = neobar_screen_invalidate;
}

// ----------------------------------------------------------------------------
// Toplevel: trivial; reports the display's screen and accepts resizes.
// ----------------------------------------------------------------------------
#define NEOBAR_TYPE_TOPLEVEL (neobar_toplevel_get_type())
G_DECLARE_FINAL_TYPE(NeobarToplevel, neobar_toplevel, NEOBAR, TOPLEVEL, WPEToplevel)
struct _NeobarToplevel {
    WPEToplevel parent;
};
G_DEFINE_TYPE(NeobarToplevel, neobar_toplevel, WPE_TYPE_TOPLEVEL)

static WPEScreen* neobar_toplevel_get_screen(WPEToplevel* toplevel) {
    WPEDisplay* display = wpe_toplevel_get_display(toplevel);
    return wpe_display_get_screen(display, 0);
}
static gboolean neobar_toplevel_resize(WPEToplevel*, int, int) { return TRUE; }
static void neobar_toplevel_set_title(WPEToplevel*, const char*) {}

// Build a LINEAR-only rendering format set so the compositor can import the
// resulting dmabuf (a driver-chosen tiled modifier failed to import).
static WPEBufferFormats* neobar_linear_formats(WPEDisplay* display) {
    WPEDRMDevice* dev = wpe_display_get_drm_device(display);
    WPEBufferFormatsBuilder* b = wpe_buffer_formats_builder_new(dev);
    wpe_buffer_formats_builder_append_group(b, dev, WPE_BUFFER_FORMAT_USAGE_RENDERING);
    wpe_buffer_formats_builder_append_format(b, DRM_FORMAT_ARGB8888, DRM_FORMAT_MOD_LINEAR);
    wpe_buffer_formats_builder_append_format(b, DRM_FORMAT_XRGB8888, DRM_FORMAT_MOD_LINEAR);
    return wpe_buffer_formats_builder_end(b);
}
static WPEBufferFormats* neobar_toplevel_get_preferred_buffer_formats(WPEToplevel* toplevel) {
    // Default: let WPE pick the GPU-optimal (tiled/compressed) modifier — cheap
    // to render and importable on the same GPU. Set NEOBAR_LINEAR=1 to force
    // LINEAR (needed only for a cross-GPU handoff).
    if (!getenv("NEOBAR_LINEAR"))
        return nullptr;
    return neobar_linear_formats(wpe_toplevel_get_display(toplevel));
}
static void neobar_toplevel_init(NeobarToplevel*) {}
static void neobar_toplevel_class_init(NeobarToplevelClass* klass) {
    auto* tc = WPE_TOPLEVEL_CLASS(klass);
    tc->get_screen = neobar_toplevel_get_screen;
    tc->resize = neobar_toplevel_resize;
    tc->set_title = neobar_toplevel_set_title;
    tc->get_preferred_buffer_formats = neobar_toplevel_get_preferred_buffer_formats;
}

// ----------------------------------------------------------------------------
// View: delivers each rendered buffer to the host callback.
// ----------------------------------------------------------------------------
#define NEOBAR_TYPE_VIEW (neobar_view_get_type())
G_DECLARE_FINAL_TYPE(NeobarView, neobar_view, NEOBAR, VIEW, WPEView)
struct _NeobarView {
    WPEView parent;
};
G_DEFINE_TYPE(NeobarView, neobar_view, WPE_TYPE_VIEW)

// Forward decl: fetch the host render callback stored on the display.
static RenderCallback* neobar_display_render_cb(WPEDisplay*);

static gboolean neobar_view_render_buffer(WPEView* view, WPEBuffer* buffer,
                                          const WPERectangle* damage, guint n_damage,
                                          GError** error) {
    RenderCallback* cb = neobar_display_render_cb(wpe_view_get_display(view));
    if (cb && *cb)
        (*cb)(view, buffer, damage, n_damage);
    else
        wpe_view_buffer_rendered(view, buffer);
    return TRUE;
}
static gboolean neobar_view_can_be_mapped(WPEView*) { return TRUE; }
static void neobar_view_init(NeobarView*) {}
static void neobar_view_class_init(NeobarViewClass* klass) {
    auto* vc = WPE_VIEW_CLASS(klass);
    vc->render_buffer = neobar_view_render_buffer;
    vc->can_be_mapped = neobar_view_can_be_mapped;
}

// ----------------------------------------------------------------------------
// Display: the backend root. Owns EGL/GBM, the screen, and the host callback.
// ----------------------------------------------------------------------------
#define NEOBAR_TYPE_DISPLAY (neobar_display_get_type())
G_DECLARE_FINAL_TYPE(NeobarDisplay, neobar_display, NEOBAR, DISPLAY, WPEDisplay)
struct _NeobarDisplay {
    WPEDisplay parent;
    int drm_fd;
    struct gbm_device* gbm;
    EGLDisplay egl;
    WPEDRMDevice* drm_device;
    NeobarScreen* screen;
    RenderCallback* render_cb;
    // seed values
    char* primary_node;
    char* render_node;
    int width, height, refresh_mhz;
};
G_DEFINE_TYPE(NeobarDisplay, neobar_display, WPE_TYPE_DISPLAY)

static RenderCallback* neobar_display_render_cb(WPEDisplay* display) {
    return NEOBAR_DISPLAY(display)->render_cb;
}

static gboolean neobar_display_connect(WPEDisplay* display, GError** error) {
    auto* self = NEOBAR_DISPLAY(display);

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
    self->screen = NEOBAR_SCREEN(g_object_new(NEOBAR_TYPE_SCREEN, "id", (guint)1, nullptr));
    wpe_screen_set_size(WPE_SCREEN(self->screen), self->width, self->height);
    wpe_screen_set_refresh_rate(WPE_SCREEN(self->screen), self->refresh_mhz);

    g_printerr("[neobar-wpe] display connected: egl=%p drm=%s %dx%d@%dmHz\n",
               self->egl, self->render_node, self->width, self->height, self->refresh_mhz);
    return TRUE;
}

static gpointer neobar_display_get_egl_display(WPEDisplay* display, GError**) {
    return NEOBAR_DISPLAY(display)->egl;
}
static guint neobar_display_get_n_screens(WPEDisplay*) { return 1; }
static WPEScreen* neobar_display_get_screen(WPEDisplay* display, guint index) {
    return WPE_SCREEN(NEOBAR_DISPLAY(display)->screen);
}
static WPEDRMDevice* neobar_display_get_drm_device(WPEDisplay* display) {
    return NEOBAR_DISPLAY(display)->drm_device;
}
static gboolean neobar_display_use_explicit_sync(WPEDisplay*) { return FALSE; }

static WPEView* neobar_display_create_view(WPEDisplay* display) {
    // One view per surface; the host maps each WPEView back to its Surface via
    // the render callback (which receives the view).
    return WPE_VIEW(g_object_new(NEOBAR_TYPE_VIEW, "display", display, nullptr));
}
static WPEToplevel* neobar_display_create_toplevel(WPEDisplay* display, guint max_views) {
    return WPE_TOPLEVEL(g_object_new(NEOBAR_TYPE_TOPLEVEL, "display", display,
                                     "max-views", max_views, nullptr));
}
static WPEBufferFormats* neobar_display_get_preferred_buffer_formats(WPEDisplay* display) {
    if (!getenv("NEOBAR_LINEAR"))
        return nullptr;  // let WPE pick GPU-optimal (tiled) modifiers
    return neobar_linear_formats(display);
}

static void neobar_display_finalize(GObject* object) {
    auto* self = NEOBAR_DISPLAY(object);
    delete self->render_cb;
    g_free(self->primary_node);
    g_free(self->render_node);
    if (self->egl != EGL_NO_DISPLAY) eglTerminate(self->egl);
    if (self->gbm) gbm_device_destroy(self->gbm);
    if (self->drm_fd >= 0) close(self->drm_fd);
    G_OBJECT_CLASS(neobar_display_parent_class)->finalize(object);
}
static void neobar_display_init(NeobarDisplay* self) {
    self->drm_fd = -1;
    self->egl = EGL_NO_DISPLAY;
    self->render_cb = new RenderCallback();
}
static void neobar_display_class_init(NeobarDisplayClass* klass) {
    G_OBJECT_CLASS(klass)->finalize = neobar_display_finalize;
    auto* dc = WPE_DISPLAY_CLASS(klass);
    dc->connect = neobar_display_connect;
    dc->get_egl_display = neobar_display_get_egl_display;
    dc->get_n_screens = neobar_display_get_n_screens;
    dc->get_screen = neobar_display_get_screen;
    dc->get_drm_device = neobar_display_get_drm_device;
    dc->use_explicit_sync = neobar_display_use_explicit_sync;
    dc->create_view = neobar_display_create_view;
    dc->create_toplevel = neobar_display_create_toplevel;
    dc->get_preferred_buffer_formats = neobar_display_get_preferred_buffer_formats;
}

// ----------------------------------------------------------------------------
// Public C++ API
// ----------------------------------------------------------------------------
WPEDisplay* neobar_display_new(const char* primary_node, const char* render_node,
                               int width, int height, int refresh_mhz) {
    auto* self = NEOBAR_DISPLAY(g_object_new(NEOBAR_TYPE_DISPLAY, nullptr));
    self->primary_node = g_strdup(primary_node);
    self->render_node = g_strdup(render_node);
    self->width = width;
    self->height = height;
    self->refresh_mhz = refresh_mhz;
    return WPE_DISPLAY(self);
}

void neobar_display_set_render_callback(WPEDisplay* display, RenderCallback cb) {
    *NEOBAR_DISPLAY(display)->render_cb = std::move(cb);
}

bool neobar_display_tick_vblank(WPEDisplay* display) {
    auto* self = NEOBAR_DISPLAY(display);
    if (!self->screen) return false;
    auto* obs = NEOBAR_SYNC_OBSERVER(neobar_screen_get_sync_observer(WPE_SCREEN(self->screen)));
    if (!obs->active) return false;
    auto* oc = WPE_SCREEN_SYNC_OBSERVER_GET_CLASS(obs);
    if (oc->sync) oc->sync(WPE_SCREEN_SYNC_OBSERVER(obs));
    return true;
}

