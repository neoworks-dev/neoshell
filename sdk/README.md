# @neoworks/neoshell-sdk

How an installed program puts widgets on neoshell. The program installs a
folder the shell finds at startup, the same way it finds `.desktop` files:

```
~/.local/share/neoshell/extensions/<id>/     (or /usr/share/neoshell/extensions/<id>/)
├── manifest.json
└── client.js        the widget's views, bundled with buildWidget
```

Its widgets run sandboxed in the shell: no network, no files, no D-Bus. All
they can see is what the program publishes, which reaches the shell over
D-Bus.

## manifest.json

```json
{
  "id": "dev.example.stocks",
  "name": "Stocks",
  "dbus": "dev.example.Stocks",
  "topics": ["quotes"],
  "calls": ["refresh"],
  "widgets": [
    {
      "view": "card",
      "name": "Stocks",
      "category": "Money",
      "description": "Your watchlist.",
      "sizes": ["small", "medium"],
      "defaultSize": "small"
    }
  ]
}
```

- `id` is lowercase reverse-DNS. If two folders claim one id, the first found
  keeps it, and the user's data dir is read before the system's.
- `dbus` is the well-known name the program owns on the session bus.
- `topics` and `calls` are plain names (no dots). They are all the widget may
  subscribe to or call.
- `sizes` are some of `small`, `medium` and `large`.

## The D-Bus side

The program serves one object:

```
interface dev.neoworks.Shell.WidgetSource1   at /dev/neoworks/Shell/WidgetSource
  method Get(topic s) → (json s)
  method Call(name s, args s) → (json s)
  signal Changed(topic s, json s)
```

All payloads are JSON, at most 256 KiB. The shell calls `Get` for every topic
when the name appears, then follows `Changed`. It watches the name with
auto-start, so a D-Bus service file
(`~/.local/share/dbus-1/services/<dbus>.service`) launches the program when the
shell needs it. While the program is gone, the widget keeps the last values it
got.

## The widget

```ts
// client.ts
import { startExtensionClient } from '@neoworks/neoshell-sdk'
import Card from './Card.svelte'

startExtensionClient('dev.example.stocks', { card: Card })
```

```svelte
<!-- Card.svelte -->
<script lang="ts">
  import { widgetBoxOf } from '@neoworks/neoshell-sdk'
  import type { ExtensionViewProps } from '@neoworks/neoshell-sdk'

  let { source, args }: ExtensionViewProps = $props()
  let quotes = $state<unknown>(null)

  $effect(() => source.subscribe('quotes', (data) => (quotes = data)))
  const box = $derived(widgetBoxOf(args))
</script>

<gtkbox class="card" orientation="vertical">
  <gtklabel class="card-title" halign="start">Stocks</gtklabel>
  <gtkbutton onclicked={() => source.call('refresh')}>Refresh</gtkbutton>
</gtkbox>
```

`source.available(handler)` tells whether the program is on the bus. Views are
svelte-gtk4 components. The shell's stylesheet styles them, and these classes
are the stable ones: `card`, `card-title`, `card-hint`, `dim-label`.

## Building

```js
import { buildWidget } from '@neoworks/neoshell-sdk/build.mjs'

await buildWidget({ entry: 'widget/client.ts', outfile: 'dist/client.js' })
```

Install `svelte` next to your widget sources: the bundle takes its Svelte
runtime from there.
