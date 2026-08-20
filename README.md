# neoshell

A desktop shell for Hyprland. A Go core, a WPE render host, and Svelte surfaces
on layer-shell.

```
task build     compile the render host, daemons, settings app, and core
task run       build the surfaces and serve them from the core
task dev       hot-reload: Vite on :5173 + the core
```

## Layout

```
Hyprland keybind ──► neoshell emit <topic> ──► control socket
                                                    │
neoshell core (127.0.0.1:9876) ─────────────────────┤
  ├─ internal/capability      one action, invocable by name from any surface
  ├─ internal/plugins         reads apps/plugins/<id>/manifest.json
  └─ internal/renderhost      drives the WPE render host's layer-shell surfaces

   the bar · the dock · the desktop      (apps/plugins/<id>)
```

Each surface is a standalone plugin: a directory under `apps/plugins/` with a
`manifest.json` declaring its layer-shell surfaces and a `dist/` the core serves
at `/plugins/<id>/`. The core creates surfaces from the manifests it finds, so
adding one is a directory, not a code change.

### Configuration

| Key | Meaning |
|---|---|
| `appearance.*` | Accent, wallpaper, and the shared background mode/alpha/blur. |
| `bar.*`, `dock.*`, `desktop.*` | Per-surface layout and module toggles. |
| `plugins.providers.*` | One toggle per feature. It governs the feature's desktop widgets and its registered actions together. |

## Keybinds

The core does not inject keybinds. Declare them in your own Hyprland config;
each one runs `neoshell emit <topic>` against the core's control socket.

| Topic | What it does |
|---|---|
| `surface:toggle\|open\|close <class>` | Show or hide a surface, e.g. `settings`. |

```conf
bind = SUPER, S, exec, neoshell emit surface:toggle settings
```

For a Lua config (`hyprland.lua`) the same bind is:

```lua
hl.bind(mod .. " + S", hl.dsp.exec_cmd("neoshell emit surface:toggle settings"))
```
