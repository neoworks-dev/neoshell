// Control protocol: a listening unix socket at $XDG_RUNTIME_DIR/neoshell-render.sock
// speaking newline-delimited JSON. Drop-in replacement for the Rust render-host's
// protocol (see render-host/src/protocol.rs). The Go core dials in as the client.
#pragma once

#include "present.h"
#include <functional>
#include <string>
#include <vector>

struct Control;

// Callbacks the host implements. `url` is the page each surface loads.
struct ControlHandler {
    std::function<void(const SurfaceSpec&, const std::string& url)> on_create;
    std::function<void(const std::string& role, EdgeKind edge, int size)> on_exclusive;
    std::function<void(const std::string& role, const std::vector<Rect>&)> on_region;
    std::function<void(const std::string& role)> on_show;
    std::function<void(const std::string& role)> on_hide;
    std::function<void(const std::string& role, KeyboardMode)> on_keyboard;
    std::function<void(const std::string& role)> on_destroy;
    // Begin dragging the given local file paths out to other apps.
    std::function<void(const std::vector<std::string>& paths)> on_start_drag;
};

// Create + bind + listen. Returns null on failure.
Control* control_new(ControlHandler handler);
int  control_listen_fd(Control*);
// On listen-fd readable: accept the client. Returns the client fd (or -1).
int  control_accept(Control*);
// On client-fd readable: read + dispatch lines. Returns false if disconnected.
bool control_read(Control*);

void control_emit_ready(Control*, const std::string& role);
void control_emit_log(Control*, const std::string& level, const std::string& msg);
// A native file drop landed on a surface; forward its paths + surface-local
// coords to the core so the frontend can act on it.
void control_emit_drop(Control*, const std::string& role, double x, double y,
                       const std::vector<std::string>& paths);
// A file drag entered or left a surface ("enter"/"leave"), so the frontend can
// react before the drop (e.g. auto-expand the notch as a drag approaches).
void control_emit_drag(Control*, const std::string& role, const std::string& phase,
                       double x, double y);
