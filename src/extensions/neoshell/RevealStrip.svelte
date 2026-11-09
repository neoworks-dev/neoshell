<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { arrayOf, recordOf, stringOf } from '../../lib/record'

  // The windows the desktop sent away, as a stack down the left edge: a
  // picture of each, taken as it went. A click on one brings them all back
  // with that one in front; the line under the stack brings them back as they
  // were. Drawn only while the desktop is shown.

  const CARD_WIDTH = 168
  const CARD_HEIGHT = 108
  const MAX_CARDS = 6
  const SLIDE_MS = 260
  const CALL_TIMEOUT_MS = 5000

  interface HiddenWindow {
    address: string
    title: string
    appClass: string
    handle: string
  }

  let { bus }: ViewProps = $props()

  let windows = $state<HiddenWindow[]>([])
  let hidden = $state(false)

  const shown = $derived(hidden && windows.length > 0)
  const cards = $derived(windows.slice(0, MAX_CARDS))
  const moreCount = $derived(Math.max(0, windows.length - MAX_CARDS))

  $effect(() =>
    subscribeTo(bus, 'reveal.state', (message) => {
      const state = recordOf(message.data)
      hidden = state.hidden === true
      windows = arrayOf(state.windows).map(windowOf)
    }),
  )

  function windowOf(record: Record<string, unknown>): HiddenWindow {
    return {
      address: stringOf(record.address),
      title: stringOf(record.title),
      appClass: stringOf(record.appClass),
      handle: stringOf(record.handle),
    }
  }

  function bringBack(focus: string): void {
    void bus.call('reveal:restore', { focus }, CALL_TIMEOUT_MS)
  }

  function moreLabel(count: number): string {
    if (count === 0) {
      return 'Bring windows back'
    }
    return `${count} more · bring all back`
  }
</script>

<gtkbox halign="start" valign="center" vexpand>
  <gtkrevealer reveal={shown} transition="slide-right" duration={SLIDE_MS}>
    <gtkbox class="reveal-strip" orientation="vertical" spacing={14} input={shown}>
      {#each cards as window (window.address)}
        <gtkpressable
          class="reveal-card"
          orientation="vertical"
          spacing={6}
          tooltip={window.title}
          onpress={() => bringBack(window.address)}
        >
          <gtkbox class="reveal-picture" width={CARD_WIDTH} height={CARD_HEIGHT} clip>
            {#if window.handle !== ''}
              <gtkpicture handle={window.handle} fit="cover" hexpand vexpand></gtkpicture>
            {:else}
              <gtklabel class="reveal-app" hexpand vexpand>{window.appClass}</gtklabel>
            {/if}
          </gtkbox>
          <gtklabel class="reveal-title" halign="start" ellipsize="end" width={CARD_WIDTH}>
            {window.title}
          </gtklabel>
        </gtkpressable>
      {/each}
      <gtkpressable class="reveal-all" onpress={() => bringBack('')}>
        <gtklabel halign="start">{moreLabel(moreCount)}</gtklabel>
      </gtkpressable>
    </gtkbox>
  </gtkrevealer>

  <!-- With no widget marked `input` the surface would take the whole left
       edge; this keeps it click-through while nothing is shown. -->
  {#if !shown}
    <gtkbox width={0} height={0} input></gtkbox>
  {/if}
</gtkbox>
