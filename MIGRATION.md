# Migration: WebKitGTK → Ultralight

## Why

WebKitGTK (2.52, Skia backend) caps at ~30 fps on this setup even with Vulkan/no-blur.
A desktop shell has to feel smooth. Ultralight is a GPU HTML renderer (WebCore layout +
JavaScriptCore + custom GPU backend) that hits native refresh, is single-process, and uses
~50–100 MB versus CEF's ~250–400 MB. The cost is no WebGL / WebGPU / `<video>` / WebRTC —
none of which this shell needs.

The browser glass look is done compositor-side (`layerrule = blur, neobar`), so the missing
CSS `backdrop-filter` / `filter: blur()` does not matter.

## License (read before shipping)

Ultralight is proprietary, closed-source. The free license (`render-host/THIRD_PARTY.md`)
imposes **no fps cap, watermark, or throttle** — the pricing page's "limited performance" is
marketing, not in the legal terms. Free is valid while both annual turnover **and** raised
funding stay under **US$100,000**; crossing either requires the Pro license ($3k/yr/app)
within 30 days. Two hard obligations that shape the build:

- **No static linking.** The host must dynamic-link `libUltralightCore.so` / `libUltralight.so`.
- **Attribution.** Ship the required notice (see `render-host/THIRD_PARTY.md`).

## Architecture

The frontend (`neobar-ui`, Svelte) and the Go core's WebSocket IPC are **unchanged**. The
frontend still loads `http://localhost:<port>/<role>` and opens `/ws` for all shell logic
(system state, hyprland dispatch, run/watch, etc.).

What changes: rendering and Wayland surface ownership move out of the in-process gotk4 webview
into a separate Rust process, the **render host**.

```
  ┌─────────────────────────┐         ┌──────────────────────────────┐
  │ neobar-core (Go)         │         │ neobar-render (Rust)         │
  │                          │ control │                              │
  │  WS hub  ── frontend IPC │ socket  │  Ultralight OSR view / role  │
  │  hyprland IPC            │◄───────►│  owns wlr-layer-shell surface│
  │  system poll            │ (JSON   │  dmabuf → compositor         │
  │  surface controller ────┼─ lines) │  wl_seat input → Ultralight  │
  │  HTTP: serves frontend  │         │                              │
  └─────────────────────────┘         └──────────────────────────────┘
        ▲  WebSocket /ws (UNCHANGED)            │ loads localhost:<port>/<role>
        └──────────────────────────────────────┘  in each Ultralight view
```

- **Go core** keeps everything it does today, minus `internal/bar`. A new
  `internal/renderhost` client speaks the control protocol to the Rust process and replaces
  the gotk4 surface/region/exclusive handling. The hub's existing window-command routing is
  reused; commands are forwarded to the host instead of `glib.IdleAdd`.
- **Render host** is a dumb pixel pump: "create surface X with this layer-shell spec, load
  this URL, give me frames, forward me input." No shell logic lives here.

### Multi-surface, not one overlay

Today there is a single fullscreen overlay with input regions carved out. The host model
gives each **role** its own right-sized layer surface (bar, dock, notch, launcher,
notifications, OSD, widgets). Right-sizing removes most of the input-region hacks; input
regions remain only where a surface is intentionally larger than its hit area (e.g. the
notch + bar strip).

## Control protocol (Go core → render host)

Newline-delimited JSON over a unix socket (`$XDG_RUNTIME_DIR/neobar-render.sock`). The Go
type is `internal/renderhost.Command`; the Rust type is `protocol::Command`. Keep them in sync.

| Command          | Fields                                                              | Effect |
|------------------|--------------------------------------------------------------------|--------|
| `surface.create` | `role, url, monitor, layer, anchors[], keyboard, exclusiveEdge, exclusiveSize` | create a layer-shell surface running an Ultralight view |
| `surface.exclusive` | `role, edge, size`                                              | reserve `size` px along `edge` (0 clears) |
| `surface.region` | `role, rects[]`                                                    | set the input region (empty = whole surface) |
| `surface.show` / `surface.hide` | `role`                                              | map / unmap without destroying |
| `surface.destroy`| `role`                                                             | tear down |

Host → core events (same socket, opposite direction): `ready {role}`, `log {level, msg}`.
Errors are logged, not fatal — a dead surface must not take the shell down.

## Stages

- [x] **0. Baseline** — committed on `main` (WebKitGTK working).
- [ ] **1. SDK + skeleton** — Ultralight SDK in place, Rust host compiles, opens a connection,
      parses the control protocol. (`render-host/` — this branch.)
- [ ] **2. One surface (wl_shm)** — host creates a single wlr-layer-shell surface and presents
      Ultralight's CPU bitmap through a `wl_shm` buffer, frame-callback driven. Proves the
      Wayland + layer-shell + Ultralight + present loop with the simplest pixel path. (Started.)
- [x] **3. Load the frontend + fps gate** — PASSED. The real neobar-ui (Svelte 5) renders
      correctly in Ultralight at a steady **144 fps** (host present-rate and on-page RAF both
      ~144 on the 144Hz panel). The migration premise holds; WebKitGTK's 30fps cap is gone.
      Required, in order: `refresh_display(0)` each frame (else animations/RAF never tick),
      `animation_timer_delay`/`scroll_timer_delay` lowered from 1/60 (else RAF capped ~60),
      and a JS compat shim (below). Verified standalone via `dist/` served statically.
- [ ] **3.5. dmabuf/GPU (optimization)** — if the CPU bitmap + shm path is not smooth enough,
      swap to the Ultralight GPU driver → EGL/gbm dmabuf → zero-copy present. Skip if shm is
      already smooth.
- [ ] **4. Input** — wl_pointer/keyboard/touch → Ultralight `fire*Event`. Click-through via
      input regions where needed. IME last.
- [ ] **5. Go controller** — `internal/renderhost` drives the host; map existing hub window
      commands onto the protocol. WebKitGTK still default behind a flag.
- [ ] **6. Cutover** — flip `cmd/neobar/main.go` to launch the host instead of `internal/bar`.
      Delete `internal/bar` + the gotk4-webkitgtk dependency.
- [ ] **7. Grow the shell** — split roles into separate surfaces (dock, notch, launcher, OSD),
      then notifications daemon (dbus), settings as a toplevel.

WebKitGTK stays the default until stage 6, so `main` is always shippable and the branch never
has a broken shell.

## Web-compat shim (required)

Ultralight's JS engine omits some web-platform globals that modern frameworks
reference unconditionally. Svelte 5's event delegation does
`node instanceof HTMLMediaElement`; with `HTMLMediaElement` undefined this throws
a ReferenceError during module evaluation and aborts the entire app mount (symptom:
only the body background paints — a black panel, no UI). `render-host/ul-compat.js`
defines harmless stubs (`HTMLMediaElement`, `HTMLVideoElement`, `HTMLAudioElement`,
`MediaStream`) so the `instanceof` checks return false instead of throwing.

It must load as a classic script BEFORE the app bundle. For the stage-3 test it was
injected into the statically served `dist/index.html`. **Production home: the Go
server injects it into `index.html` when serving the frontend** (stage 5/6) — wire
this in `internal/server` so every Ultralight-loaded page gets it. Expect to extend
the stub list as more frameworks/components surface other missing globals.

## Verify before stage 6

Stage 3's fps counter is the gate. If Ultralight does not hit full refresh with the real
Svelte UI, stop — the whole migration premise fails and CEF OSR is the fallback. Do not delete
`internal/bar` until that is green.
