# Maintainer: Moritz Utcke <moritz.utcke@gmx.de>
#
# Builds from the checkout this PKGBUILD lives in (the UI and SDK are local git
# submodules, so there is no upstream tarball/remote to fetch yet). Run from the
# repo root:  makepkg -si
#
# The dependency arrays below are the source of truth for distribution; see
# DEPENDENCIES.md for the per-component rationale.

pkgname=neoshell
pkgver=0
pkgrel=1
pkgdesc="Wayland desktop shell (bar, desktop, dock, widgets) rendered via a C++/WPE host, driven by a Go core"
arch=('x86_64')
url="https://github.com/neoworks/neoshell"
license=('MIT')

# Runtime shared libraries. wpewebkit pulls the rest of the render host's closure
# (gstreamer, icu, harfbuzz, libsoup, …) transitively, so only direct deps appear.
depends=(
  'wpewebkit'       # libWPEWebKit-2.0 / wpe-platform-2.0 — render host web engine
  'libwpe'          # libwpe-1.0.so.1
  'wayland'         # libwayland-client/cursor/egl — render host + wallpaper daemon
  'libdrm'          # dmabuf / DRM
  'mesa'            # libgbm
  'libglvnd'        # libEGL / libGLX dispatch
  'libxkbcommon'    # keyboard mapping
  'webkit2gtk-4.1'  # settings app (Tauri 2 WebView)
  'gtk3'            # settings app window (also pulled in by webkit2gtk-4.1)
)

# Toolchains + headers needed only to compile.
makedepends=(
  'go'              # Go core
  'rust'            # cargo: wallpaper daemon + settings app
  'bun'             # Svelte UI build
  'go-task'         # Taskfile.yml build orchestrator
  'base-devel'      # g++ for the render host
  'make'
  'pkgconf'         # pkg-config in the render host Makefile
  'nlohmann-json'   # JSON header for the render host control protocol
)

# A wlroots-based compositor (Hyprland, Sway, river, …) implementing
# wlr-layer-shell + linux-dmabuf is required at runtime but is not a package dep.
optdepends=(
  'gst-plugins-good: <video>/<audio> playback in web surfaces'
  'gst-plugins-bad: extra media codecs in web surfaces'
  'ollama: semantic file search embeddings (nomic-embed-text/vision)'
  'surrealdb: persistent BM25 + vector index for semantic file search'
)

source=()
sha256sums=()

pkgver() {
  cd "$startdir"
  printf '0.r%s.%s' "$(git rev-list --count HEAD)" "$(git rev-parse --short HEAD)"
}

build() {
  cd "$startdir"
  # render host, wallpaper daemon, settings app, Go core (Taskfile build), then UI.
  task build
  task ui:build
}

package() {
  cd "$startdir"

  # Real binaries live under /usr/lib; a wrapper on PATH wires the env the core
  # expects (render/settings binary paths + the served frontend).
  install -Dm755 neoshell                                   "$pkgdir/usr/lib/neoshell/neoshell"
  install -Dm755 apps/render-host/neoshell-render           "$pkgdir/usr/lib/neoshell/neoshell-render"
  install -Dm755 apps/settings/target/release/neoshell-settings "$pkgdir/usr/lib/neoshell/neoshell-settings"
  install -Dm755 apps/bg/target/release/neoshell-bg         "$pkgdir/usr/lib/neoshell/neoshell-bg"
  install -Dm755 apps/shell/neoshell-search                "$pkgdir/usr/lib/neoshell/neoshell-search"

  # Built frontend served by the core.
  install -d "$pkgdir/usr/share/neoshell/ui"
  cp -r apps/ui/dist/. "$pkgdir/usr/share/neoshell/ui/"

  install -Dm755 /dev/stdin "$pkgdir/usr/bin/neoshell" <<'EOF'
#!/bin/sh
export NEOSHELL_RENDER_BIN="${NEOSHELL_RENDER_BIN:-/usr/lib/neoshell/neoshell-render}"
export NEOSHELL_SETTINGS_BIN="${NEOSHELL_SETTINGS_BIN:-/usr/lib/neoshell/neoshell-settings}"
export NEOSHELL_SEARCH_BIN="${NEOSHELL_SEARCH_BIN:-/usr/lib/neoshell/neoshell-search}"
exec /usr/lib/neoshell/neoshell --frontend /usr/share/neoshell/ui "$@"
EOF

  ln -s /usr/lib/neoshell/neoshell-bg "$pkgdir/usr/bin/neoshell-bg"
}
