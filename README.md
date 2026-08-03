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

```
# assistant
bind  = SUPER, A,       exec, neoshell emit agent:open
bind  = SUPER, Escape,  exec, neoshell emit agent:interrupt
bind  = SUPER, Y,       exec, neoshell emit agent:approve
bind  = SUPER, N,       exec, neoshell emit agent:deny
bind  = SUPER SHIFT, Y, exec, neoshell emit agent:always

# voice
bind  = SUPER, V,       exec, neoshell emit voice:toggle
bind  = SUPER, space,   exec, neoshell emit voice:listen
bindr = SUPER, space,   exec, neoshell emit voice:stop

# surfaces
bind  = SUPER, D,       exec, neoshell emit surface:toggle spotlight
bind  = SUPER, comma,   exec, neoshell emit surface:toggle settings
```

`agent:approve` / `agent:deny` answer the longest-waiting tool call, so pressing
yes answers the thing the notch is showing. `agent:always` is the same as yes
plus "stop asking about this tool for the rest of the session".

Other topics: `agent:close`, `agent:ask <text>`, `agent:always-project`,
`agent:restart` (after the backend has failed enough times to give up),
`voice:cancel`, `surface:open`, `surface:close`.

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
