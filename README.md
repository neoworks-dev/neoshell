# neoshell

A desktop shell for Hyprland. A Go core, a WPE render host, Svelte surfaces on
layer-shell, and an assistant that can drive the desktop.

```
task build     compile the render host, daemons, settings app, and core
task run       build the surfaces and serve them from the core
task dev       hot-reload: Vite on :5173 + the core
task probe     the assistant stack alone, no render host (see below)
```

## The assistant

The shell does not contain a model. It spawns [nib](https://github.com/moritzUtcke/nib)
as a child process, keeps one session alive for as long as the shell runs, and
publishes what happens on that session to its surfaces. nib owns the
conversation, the tool loop, and the approval semantics; the shell owns the
desktop and lends it out.

```
Hyprland keybind ──► neoshell emit <topic> ──► control socket
                                                    │
neoshell core (127.0.0.1:9876) ─────────────────────┤
  ├─ internal/capability      one action = one launcher command = one agent tool
  ├─ internal/nib             supervisor + client + the shell's session
  └─ GET /capabilities · POST /capabilities/invoke   (bearer token, loopback)
        ▲                              │
        │ spawn --socket               │ fetch()
        ▼                              │
   nib ──── ~/.nib/extensions/neoshell.ts ──┘
        ▲
        ▼
   the notch (apps/plugins/bar)  ·  neoshell-voice (mic + speaker)
```

**Desktop control is not built into nib.** `apps/nib-extension/neoshell.ts` is an
ordinary nib extension: at load it fetches the shell's capability registry over
HTTP and turns each action into a `registerTool` call, carrying the shell's own
approval policy with it. Adding a capability in Go is the whole job — the tool
appears with no change on either side. `task build` symlinks the extension into
`~/.nib/extensions/`.

Point the core at nib with `NEOSHELL_NIB_DIR` (a checkout, run through bun) or
`NEOSHELL_NIB_BIN` (a compiled `nib-server`). With neither, the shell runs fine
without an assistant.

### Configuration

| Key | Meaning |
|---|---|
| `nib.workspace` | Working directory for the session. `$HOME` by default. |
| `nib.provider`, `nib.model`, `nib.thinking` | Left empty, nib applies its own defaults. |
| `nib.sessionId` | Written by the shell so a restart resumes the same conversation. |
| `voice.enabled` | Whether the voice daemon runs. Toggled by keybind, persisted. |
| `voice.mode` | `ptt`, `wake`, or `always`. |
| `plugins.providers.*` | One toggle per feature. It governs the launcher provider, the desktop widgets, and the agent's tools together. |

## Keybinds

The core does not inject keybinds. Declare them in your own Hyprland config;
each one runs `neoshell emit <topic>` against the core's control socket.

| Topic | What it does |
|---|---|
| `agent:open` / `agent:close` | Expand the notch's assistant panel and focus its input. |
| `agent:ask <text>` | Send a prompt without typing it — useful from a script. |
| `agent:approve` / `agent:deny` | Answer the longest-waiting tool call, which is the one the notch is showing. |
| `agent:always` | Approve, and stop asking about that tool for the rest of the session. |
| `agent:always-project` | The same, remembered for this workspace. |
| `agent:interrupt` | Stop the current turn. |
| `agent:restart` | Restart the backend after it has failed enough times to give up. |
| `voice:toggle` | Turn voice mode on or off. Starts and stops the daemon that holds the microphone, so "off" releases the device. |
| `voice:listen` / `voice:stop` | Push-to-talk: bind the second one on key release. |
| `voice:cancel` | Abort the spoken turn. |
| `surface:toggle\|open\|close <class>` | Show or hide a surface, e.g. `spotlight`, `settings`. |

A set that leaves the common Hyprland defaults alone:

```conf
# assistant
bind  = SUPER, A,        exec, neoshell emit agent:open
bind  = SUPER SHIFT, A,  exec, neoshell emit agent:interrupt
bind  = SUPER, Y,        exec, neoshell emit agent:approve
bind  = SUPER, N,        exec, neoshell emit agent:deny
bind  = SUPER SHIFT, Y,  exec, neoshell emit agent:always

# voice — hold Z to talk, CTRL+Z to turn voice mode off entirely
bind  = SUPER, Z,        exec, neoshell emit voice:listen
bindr = SUPER, Z,        exec, neoshell emit voice:stop
bind  = SUPER SHIFT, Z,  exec, neoshell emit voice:cancel
bind  = SUPER CTRL, Z,   exec, neoshell emit voice:toggle

# surfaces
bind  = SUPER, SPACE,    exec, neoshell emit surface:toggle spotlight
```

For a Lua config (`hyprland.lua`) the same binds are:

```lua
hl.bind(mod .. " + A", hl.dsp.exec_cmd("neoshell emit agent:open"))
hl.bind(mod .. " + SHIFT + A", hl.dsp.exec_cmd("neoshell emit agent:interrupt"))
hl.bind(mod .. " + Y", hl.dsp.exec_cmd("neoshell emit agent:approve"))
hl.bind(mod .. " + N", hl.dsp.exec_cmd("neoshell emit agent:deny"))
hl.bind(mod .. " + SHIFT + Y", hl.dsp.exec_cmd("neoshell emit agent:always"))

hl.bind(mod .. " + Z", hl.dsp.exec_cmd("neoshell emit voice:listen"))
hl.bind(mod .. " + Z", hl.dsp.exec_cmd("neoshell emit voice:stop"), { release = true })
hl.bind(mod .. " + SHIFT + Z", hl.dsp.exec_cmd("neoshell emit voice:cancel"))
hl.bind(mod .. " + CTRL + Z", hl.dsp.exec_cmd("neoshell emit voice:toggle"))
```

## Approvals

Actions that only read state (`windows:list`, `files:search`, `widgets:list`)
run without asking. Anything that changes the machine — moving a window,
launching an application, placing a widget, running a command — asks first, and
the notch expands to show exactly what was proposed before you answer.

`always this session` is the escape hatch when a tool is being asked about
repeatedly. It is per-tool and per-session, so it never silently outlives the
conversation it was granted in.

## Verifying the assistant without taking over the screen

`task run` starts the render host, which claims the screen. To exercise the
assistant against a live session instead:

```
task probe                                  # capability routes + backend on :9899
task probe -- ask "how many windows are open?"   # one real turn, tools and all
```

The probe serves the same capability routes the extension calls, so
`curl -H "Authorization: Bearer $NEOSHELL_TOKEN" localhost:9899/capabilities`
shows exactly what the agent can reach.

One thing worth watching: a turn should produce its first stream event
immediately. If a turn takes about fifteen seconds when the model answers in
one, the event stream is being reopened per turn rather than held open — nib
writes nothing to an idle stream until its keepalive, and that delay is the
signature.
