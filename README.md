# neoshell

A desktop shell for Hyprland. A small TypeScript host — a pub/sub bus plus a
render pipeline — and everything else as extensions. See `ARCHITECTURE.md`
for the full design.

```
task build     compile the render host, daemons, and the notifications bridge
task run       run the host (spawns the render host, mounts extensions)
task test      run every test suite
```

## Layout

```
Hyprland keybind ──► neoshell-emit <topic> ──► unix socket
                                                    │
neoshell-host (bun, 127.0.0.1:9877) ────────────────┤
  ├─ bus            pub/sub with retained topics; unix socket + WebSocket
  ├─ extensions     mounts apps/extensions/<id> backends as kernel fibers
  ├─ view tree      config-declared UI tree → one webview per top-level node
  └─ render host    C++/WPE layer-shell webviews (apps/render-host)

apps/extensions/<id>/     backend.ts (host-side) and/or dist/views.js (webview)
packages/kernel           the plugin kernel (fibers, services, effects)
packages/surface          the webview runtime (bus client, view registry, renderer)
```

An extension is a directory under `apps/extensions/` with a `manifest.json`.
It contributes **functions** (a backend module mounted in the host, talking
over the bus) and/or **views** (an ES module the webviews import from
`/plugins/<id>/`). Backends that need another language spawn a daemon as an
effect — the notifications extension runs a Go D-Bus bridge this way.

The UI is declared in the config as a tree of view nodes; each top-level node
becomes a layer-shell webview. Adding a view is a config edit, not a code
change.

### Configuration

`~/.config/neoshell/config.json`

| Key | Meaning |
|---|---|
| `views` | The view tree: `[{id, type, args, children}]`. Top-level `args` carry the layer-shell spec (layer, anchors, exclusive, keyboard). |
| `extensions` | The mount list: which extension backends run, with per-extension config. |
| `appearance.*` | Wallpaper and the shared background blur. |

## Keybinds

The host does not inject keybinds. Declare them in your own Hyprland config;
each one publishes a message on the host's bus:

```conf
bind = SUPER, S, exec, bun /path/to/neoshell/apps/host/src/emit.ts surface:toggle settings
```
