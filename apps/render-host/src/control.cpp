#include "control.h"

#include <glib.h>
#include <nlohmann/json.hpp>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstdio>
#include <cstdlib>
#include <cstring>

using json = nlohmann::json;

struct Control {
    ControlHandler handler;
    int listen_fd = -1;
    int client_fd = -1;
    std::string inbuf;   // accumulates partial lines
};

static std::string socket_path() {
    const char* runtime = getenv("XDG_RUNTIME_DIR");
    char buf[256];
    if (runtime && *runtime)
        snprintf(buf, sizeof(buf), "%s/neoshell-render.sock", runtime);
    else
        snprintf(buf, sizeof(buf), "/run/user/%d/neoshell-render.sock", getuid());
    return buf;
}

Control* control_new(ControlHandler handler) {
    auto* c = new Control();
    c->handler = std::move(handler);

    std::string path = socket_path();
    unlink(path.c_str());   // clear stale socket
    c->listen_fd = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
    if (c->listen_fd < 0) { g_printerr("[control] socket() failed\n"); return c; }

    sockaddr_un addr{};
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, path.c_str(), sizeof(addr.sun_path) - 1);
    if (bind(c->listen_fd, (sockaddr*)&addr, sizeof(addr)) < 0) {
        g_printerr("[control] bind(%s) failed\n", path.c_str());
        close(c->listen_fd); c->listen_fd = -1; return c;
    }
    if (listen(c->listen_fd, 1) < 0) {
        g_printerr("[control] listen() failed\n");
        close(c->listen_fd); c->listen_fd = -1; return c;
    }
    g_printerr("[control] listening on %s\n", path.c_str());
    return c;
}

int control_listen_fd(Control* c) { return c->listen_fd; }

int control_accept(Control* c) {
    int fd = accept4(c->listen_fd, nullptr, nullptr, SOCK_CLOEXEC);
    if (fd < 0) return -1;
    c->client_fd = fd;
    c->inbuf.clear();
    g_printerr("[control] client connected\n");
    return fd;
}

// ---- enum parsing (lowercase strings -> enums) ----
static LayerKind parse_layer(const std::string& s) {
    if (s == "background") return LAYER_BACKGROUND;
    if (s == "bottom") return LAYER_BOTTOM;
    if (s == "overlay") return LAYER_OVERLAY;
    return LAYER_TOP;
}
static KeyboardMode parse_keyboard(const std::string& s) {
    if (s == "exclusive") return KB_EXCLUSIVE;
    if (s == "ondemand") return KB_ONDEMAND;
    return KB_NONE;
}
static EdgeKind parse_edge(const std::string& s) {
    if (s == "top") return EDGE_TOP;
    if (s == "bottom") return EDGE_BOTTOM;
    if (s == "left") return EDGE_LEFT;
    if (s == "right") return EDGE_RIGHT;
    return EDGE_NONE;
}
static uint32_t parse_anchors(const json& arr) {
    uint32_t a = 0;
    if (!arr.is_array()) return a;
    for (const auto& e : arr) {
        std::string s = e.get<std::string>();
        if (s == "top") a |= ANCHOR_TOP;
        else if (s == "bottom") a |= ANCHOR_BOTTOM;
        else if (s == "left") a |= ANCHOR_LEFT;
        else if (s == "right") a |= ANCHOR_RIGHT;
    }
    return a;
}

static void dispatch(Control* c, const json& msg) {
    std::string cmd = msg.value("cmd", "");
    std::string role = msg.value("role", "");
    auto& h = c->handler;

    if (cmd == "surface.create") {
        SurfaceSpec spec;
        spec.role = role;
        spec.monitor = msg.value("monitor", "");
        spec.layer = parse_layer(msg.value("layer", "top"));
        if (msg.contains("anchors")) spec.anchors = parse_anchors(msg["anchors"]);
        spec.width = msg.value("width", 0);
        spec.height = msg.value("height", 0);
        spec.keyboard = parse_keyboard(msg.value("keyboard", "none"));
        if (msg.contains("exclusive_edge") && msg["exclusive_edge"].is_string())
            spec.exclusive_edge = parse_edge(msg["exclusive_edge"].get<std::string>());
        spec.exclusive_size = msg.value("exclusive_size", 0);
        if (h.on_create) h.on_create(spec, msg.value("url", ""));
    } else if (cmd == "surface.exclusive") {
        if (h.on_exclusive)
            h.on_exclusive(role, parse_edge(msg.value("edge", "top")), msg.value("size", 0));
    } else if (cmd == "surface.region") {
        std::vector<Rect> rects;
        if (msg.contains("rects") && msg["rects"].is_array())
            for (const auto& r : msg["rects"])
                rects.push_back({r.value("x", 0), r.value("y", 0),
                                 r.value("w", 0), r.value("h", 0)});
        if (h.on_region) h.on_region(role, rects);
    } else if (cmd == "surface.show") {
        if (h.on_show) h.on_show(role);
    } else if (cmd == "surface.hide") {
        if (h.on_hide) h.on_hide(role);
    } else if (cmd == "surface.destroy") {
        if (h.on_destroy) h.on_destroy(role);
    } else {
        g_printerr("[control] unknown cmd '%s'\n", cmd.c_str());
    }
}

bool control_read(Control* c) {
    char buf[4096];
    ssize_t n = read(c->client_fd, buf, sizeof(buf));
    if (n <= 0) {
        if (n == 0) g_printerr("[control] client disconnected\n");
        close(c->client_fd);
        c->client_fd = -1;
        return false;
    }
    c->inbuf.append(buf, n);
    size_t pos;
    while ((pos = c->inbuf.find('\n')) != std::string::npos) {
        std::string line = c->inbuf.substr(0, pos);
        c->inbuf.erase(0, pos + 1);
        if (line.empty()) continue;
        try {
            dispatch(c, json::parse(line));
        } catch (const std::exception& e) {
            g_printerr("[control] bad json: %s\n", e.what());
        }
    }
    return true;
}

static void emit(Control* c, const json& ev) {
    if (c->client_fd < 0) return;
    std::string line = ev.dump();
    line.push_back('\n');
    ssize_t r = write(c->client_fd, line.data(), line.size());
    (void)r;
}
void control_emit_ready(Control* c, const std::string& role) {
    emit(c, json{{"event", "ready"}, {"role", role}});
}
void control_emit_log(Control* c, const std::string& level, const std::string& msg) {
    emit(c, json{{"event", "log"}, {"level", level}, {"msg", msg}});
}
