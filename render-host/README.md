# neobar render-host (C++ / WPE WebKit)

Off-screen web renderer for the neobar shell. Each shell surface (bar, dock,
desktop, widgets…) is a `wlr-layer-shell` surface backed by an off-screen
`WebKitWebView`; frames arrive as zero-copy **dmabuf** and are presented at the
compositor's vblank. Driven by the Go core over a unix-socket JSON protocol.

Replaces the previous Rust/CEF host (see `../MIGRATION.md`): WPE is lighter than
Chromium (no ~200MB runtime, no per-frame BGRA memcpy) at the same 144fps.

## Build

```sh
make            # -> ./neobar-render
```

Dependencies (system): `wpewebkit`, `libwpe`, `wpebackend-fdo`, EGL, GBM, libdrm,
wayland-client, xkbcommon, `nlohmann-json`, plus `wayland-protocols` +
`wlr-protocols` (the layer-shell XML in `protocols/`).

## How it works

- **`wpe_backend.{h,cpp}`** — a custom WPEPlatform backend (a `WPEDisplay` /
  `WPEScreen` / `WPEScreenSyncObserver` / `WPEView` / `WPEToplevel`). The sync
  observer is ticked by the host (from each surface's frame callback), so WPE
  renders off-screen at a rate we drive. Frames are delivered as `WPEBufferDMABuf`.
- **`present.{h,cpp}`** — the Wayland connection + N layer-shell surfaces. Imports
  each dmabuf via `zwp_linux_dmabuf` and attaches it; routes `wl_seat` pointer/
  keyboard input to the focused surface. Resolves the **compositor's render GPU**
  from dmabuf-feedback `main_device` — all surfaces render there regardless of
  which output they're on (the compositor scans out to other GPUs' connectors;
  cross-GPU buffers are rejected).
- **`control.{h,cpp}`** — the unix-socket protocol (`$XDG_RUNTIME_DIR/neobar-render.sock`):
  `surface.create/exclusive/region/show/hide/destroy` in, `ready`/`log` out.
- **`main.cpp`** — wires it together on a GLib main loop.

## Env

- `NEOBAR_RENDER_NODE` / `NEOBAR_PRIMARY_NODE` — override the auto-detected GPU.
- `NEOBAR_60FPS` — cap page rendering near 60fps (default: full refresh).
- `NEOBAR_INPUT_DEBUG`, `NEOBAR_LOG_TITLE` — debug logging.
