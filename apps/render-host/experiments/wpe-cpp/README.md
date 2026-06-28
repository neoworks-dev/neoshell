# WPE C++ spike

Throwaway proof that a **custom WPEPlatform backend in C++** can drive WPE WebKit to
render **off-screen at a vblank we control**, deliver each frame as a **zero-copy dmabuf**,
and present it on a **wlr-layer-shell** surface. This is the load-bearing path for a
potential CEF → WPE render-host migration (see `../../MIGRATION.md`).

## Build & run

```sh
make
FLAG60=off ./neobar-wpe          # target 144 (PreferPageRenderingUpdatesNear60FPS disabled)
FLAG60=on  ./neobar-wpe          # ~72 (the 60fps harmonic kept) — proves the knob
RUN_SECS=8 W=900 H=500 ./neobar-wpe
RENDER_NODE=/dev/dri/renderD129 PRIMARY_NODE=/dev/dri/card2 ./neobar-wpe   # pick GPU
```

Needs `wpewebkit`, `libwpe`, `wpebackend-fdo`, EGL, GBM, libdrm, wayland + wlr-layer-shell.

## What it proves (results on this machine: Hyprland, AMD iGPU + NVIDIA dGPU)

- **Custom backend works.** `src/wpe_backend.cpp` subclasses `WPEDisplay`, `WPEScreen`,
  `WPEScreenSyncObserver`, `WPEView`, `WPEToplevel` — all in C++ via plain GObject.
- **External vblank → WPE renders at our rate.** Ticking the custom sync observer from a
  7ms timer (no real display) gave **141 render_buffer/s** flag-off, **71** flag-on.
  WPE is *not* capped at 60 — the rate is whatever drives the observer.
- **Zero-copy dmabuf.** Frames arrive via `WPEView::render_buffer` as `WPEBufferDMABuf`
  (fd / fourcc / modifier / stride), imported with `zwp_linux_dmabuf` and shown on a
  layer surface. No CPU copy (unlike CEF's wl_shm memcpy).
- **Real-vblank present loop is self-sustaining** — the layer surface's frame callback
  ticks WPE; buffers release and recycle cleanly.

## Known limits (left for the real port, not architecture blockers)

- **Multi-GPU matters.** Must render on the **compositor's GPU**. Here Hyprland composites
  the laptop panel on the AMD iGPU (`renderD129`); a buffer rendered on NVIDIA
  (`renderD128`) is a cross-GPU tiled import and the compositor **rejects the modifier**.
  Rendering on the AMD node yields a `LINEAR` (mod 0) buffer that imports fine. The real
  host must select the render node from the compositor's dmabuf-feedback `main_device`.
- **Present sustains a solid 144fps** on the layer surface (flag off) with the panel idle.
  An earlier ~50–70fps reading was GPU contention from another app (a running game), not a
  loop limit — the naive synchronous single-buffer loop is adequate at native refresh.
  Pipelining (render-ahead + buffer pool) is still worth doing for headroom under load, but
  is not required to reach 144.

## GPU cost (measured, AMD iGPU drives the panel; NVIDIA dGPU)

- **Idle / static page: ~0% GPU.** The loop renders nothing when the page doesn't animate
  (no rAF → no frames → no ticks). This is the shell's normal state.
- **Continuous 144fps animation: ~70% iGPU**, with either a LINEAR or an AMD-tiled (DCC)
  modifier — the modifier barely moves the average. This is the cost of rendering +
  compositing 144 full frames/sec of an animating page on a weak iGPU, and it is roughly
  **engine-independent** (CEF pays the same). WPE does **not** make active rendering cheaper
  on the GPU; its wins over CEF are CPU (no per-frame BGRA memcpy) and memory (RSS).
- **Render on the GPU that drives the panel.** Here that's the AMD iGPU (`renderD129`).
  Rendering on the NVIDIA dGPU (`renderD128`) produces an NVIDIA-tiled buffer the compositor
  **rejects** (it imports for the panel on AMD) — so NVIDIA is not a usable render target
  for this output. Prefer the GPU-optimal (tiled/DCC) modifier by returning `nullptr` from
  `get_preferred_buffer_formats`; force LINEAR (`NEOBAR_LINEAR=1`) only for a cross-GPU path.
- Practical implication for a shell: don't drive continuous 144fps animation. Static is
  free; cap on-demand animations or render only damaged regions.
- WPE ignores our advertised `WPEBufferFormats` and picks the GPU-optimal modifier anyway;
  we get LINEAR only as a side effect of the AMD path. Real port should negotiate via
  dmabuf-feedback tranches.

## Files

- `src/wpe_backend.{h,cpp}` — the custom WPEPlatform backend (the novel part).
- `src/wayland_present.{h,cpp}` — layer-shell + dmabuf import + frame-callback vblank.
- `src/main.cpp` — wires it together on a GLib main loop; loads `raf-counter.html`.
