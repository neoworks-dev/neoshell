# Dependencies

System packages neoshell needs to **build** and **run**. Package names are for
Arch / CachyOS (`pacman`); on other distros the library names in parentheses map
to your distro's equivalents.

Install everything (Arch):

```sh
# Runtime + build, in one go.
sudo pacman -S --needed \
  wpewebkit libwpe wayland libdrm libxkbcommon mesa libglvnd \
  webkit2gtk-4.1 gtk3 \
  go rust bun go-task base-devel make pkgconf nlohmann-json
```

A wlroots-based Wayland compositor is also required at runtime (see
[Compositor](#compositor)).

---

## Runtime

Shared libraries the installed binaries load. Most of the render host's heavy
closure (GStreamer, ICU, HarfBuzz, libsoup…) is pulled in transitively by
`wpewebkit`, so only the direct dependencies are listed.

| Package | Provides (library) | Used by |
|---|---|---|
| `wpewebkit` | `libWPEWebKit-2.0.so`, `libwpe-platform-2.0` | render host — the off-screen web engine |
| `libwpe` | `libwpe-1.0.so.1` | render host — WPE general lib |
| `wayland` | `libwayland-client/cursor/egl/server` | render host, wallpaper daemon — layer-shell client |
| `libdrm` | `libdrm.so.2` | render host — dmabuf / DRM |
| `mesa` | `libgbm.so.1` | render host — GBM buffer allocation |
| `libglvnd` | `libEGL.so.1`, `libGLX.so.0` | render host — EGL/GL dispatch |
| `libxkbcommon` | `libxkbcommon.so.0` | render host — keyboard mapping |
| `webkit2gtk-4.1` | `libwebkit2gtk-4.1.so` | settings app — Tauri 2 WebView |
| `gtk3` | `libgtk-3.so.0` | settings app — Tauri 2 window (pulled in by webkit2gtk-4.1) |

The Go core itself links only libc — it is statically built otherwise.

### Optional (runtime)

| Package | Enables |
|---|---|
| `gst-plugins-good`, `gst-plugins-bad` | `<video>` / `<audio>` playback in web surfaces (wpewebkit ships only `gst-plugins-base`) |
| `ollama` | Embeddings for **semantic file search** (`neoshell-search`). Pull the models: `ollama pull nomic-embed-text` (text/PDF + queries) and `ollama pull moondream` (captions images so they're searchable in the same vector space). |
| `surrealdb` | Persistent BM25 + vector index for semantic file search. AUR/official installer (not in the official repos). |

Without `ollama`/`surrealdb` the search daemon degrades gracefully: filename +
in-memory text search still works, just without semantic recall or persistence.

## Build

Required only to compile from source; not needed on an installed system.

| Package | Builds |
|---|---|
| `go` | the Go core (`neoshell`) |
| `rust` | the wallpaper daemon (`apps/bg`) and settings app (`apps/settings`), via `cargo` |
| `bun` | the Svelte UI (`apps/ui`) |
| `go-task` | runs `Taskfile.yml` (the build orchestrator) |
| `base-devel`, `make` | C++ toolchain (`g++`) for the render host |
| `pkgconf` | `pkg-config` lookups in the render host `Makefile` |
| `nlohmann-json` | JSON header used by the render host control protocol |
| `wayland` | `wayland-scanner` generates the protocol glue (also a runtime dep) |
| `webkit2gtk-4.1` | Tauri links it when building the settings app (also a runtime dep) |

The Wayland protocol XML the render host needs (`wlr-layer-shell`, `xdg-shell`,
`linux-dmabuf`) is vendored in `apps/render-host/protocols/`, so
`wayland-protocols` / `wlr-protocols` are **not** build dependencies.

## Compositor

neoshell is a `wlr-layer-shell` client; it runs on any wlroots-based Wayland
compositor (Hyprland, Sway, river, …). The compositor must implement
`zwlr_layer_shell_v1` and `zwp_linux_dmabuf_v1`. The `task monitors` helper uses
`hyprctl` + `jq`, but those are a dev convenience, not a runtime requirement.

## Notes

- `wpebackend-fdo` is **not** required. The render host ships a custom
  `WPEPlatform` backend (`apps/render-host/src/wpe_backend.cpp`) that replaced the
  FDO backend used during the spike, so neither the binary nor the build links it.
- `bun` and `go-task` are in the official repos on CachyOS/Arch. On a plain Arch
  install they may come from the AUR (`bun-bin`) — adjust accordingly.
