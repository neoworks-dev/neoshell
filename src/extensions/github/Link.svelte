<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { BusService } from '../../lib/bus'

  // Whatever is inside opens `url` in the browser when pressed. The backend
  // does the opening, and only for links it published itself. A `thread` marks
  // that notification read on the way.
  //
  // `row` gives the hover highlight of a list row; a link around a figure or a
  // graph has none.

  const OPEN_TIMEOUT_MS = 5000

  let {
    bus,
    url,
    thread = '',
    row = false,
    children,
  }: {
    bus: BusService
    url: string
    thread?: string
    row?: boolean
    children: Snippet
  } = $props()

  const linkClass = $derived(linkClassOf(row))

  function linkClassOf(isRow: boolean): string {
    if (isRow) {
      return 'card-row'
    }
    return ''
  }

  function open(): void {
    if (url === '') {
      return
    }
    void bus.call('github:open', { url, thread }, OPEN_TIMEOUT_MS).catch(() => undefined)
  }
</script>

<gtkpressable class={linkClass} orientation="vertical" hexpand halign="fill" valign="center" onpress={open}>
  {@render children()}
</gtkpressable>
