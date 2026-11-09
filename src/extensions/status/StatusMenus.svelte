<script lang="ts">
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { numberOf, recordOf, stringOf } from '../../lib/record'
  import type { ViewProps } from '../../host/plugins/views'
  import { resolve } from '../../tree'
  import { NO_MENU, openMenuOf, statusItemsOf } from './statusItems'
  import type { OpenMenu, StatusItem } from './statusItems'

  // The menu host: the one dropdown box every status item's menu is drawn in,
  // hanging under the item's icon. The window spans the output, like the bar;
  // while a menu is open a backdrop under the box takes any click elsewhere
  // and closes it. A closed host keeps a zero-size input marker: an empty
  // input region is what keeps the surface click-through, and a surface with
  // no marked widget at all would claim every click.
  //
  //   args.monitor     the connector it was placed on; it answers that bar only
  //   args.offsetTop   the bar's height plus the gap the box hangs below it

  const EDGE_GAP = 6

  let { bus, registry, args }: ViewProps = $props()

  const monitor = $derived(stringOf(recordOf(args).monitor))
  const offsetTop = $derived(numberOf(recordOf(args).offsetTop, 36))

  let items = $state<StatusItem[]>([])
  let current = $state<OpenMenu>(NO_MENU)
  let generation = $state(0)

  const item = $derived(items.find((candidate) => candidate.id === current.id))
  const Menu = $derived(menuOf(item, generation))

  $effect(() =>
    subscribeTo(bus, 'status.catalog', (message) => {
      items = statusItemsOf(recordOf(message.data).items)
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'status:toggle', (message) => {
      toggle(openMenuOf(recordOf(message.data)))
    }),
  )

  $effect(() => subscribeTo(bus, 'status:close', () => close()))

  $effect(() =>
    registry.onChange(() => {
      generation += 1
    }),
  )

  // What is open is retained so each bar can mark its open icon.
  $effect(() => {
    const open = current
    return untrack(() => bus.retain('status.open', { id: open.id, monitor: open.monitor }))
  })

  // A request for another monitor closes this one's menu: one menu at a time.
  function toggle(requested: OpenMenu): void {
    if (requested.monitor !== monitor || requested.id === current.id) {
      current = NO_MENU
      return
    }
    current = requested
  }

  function close(): void {
    current = NO_MENU
  }

  function menuOf(open: StatusItem | undefined, currentGeneration: number) {
    if (open === undefined || open.menu === '') {
      return undefined
    }
    return resolve(registry, open.menu, currentGeneration)
  }
</script>

{#if Menu !== undefined}
  <gtkoverlay hexpand vexpand>
    <gtkpressable class="menu-backdrop" hexpand vexpand input onpress={close}></gtkpressable>
    <gtkbox
      overlay
      class="status-menu"
      orientation="vertical"
      halign="end"
      valign="start"
      margin-top={offsetTop}
      margin-end={Math.max(EDGE_GAP, current.anchorEnd - EDGE_GAP)}
      input
    >
      {#key current.id}
        <Menu {bus} {registry} args={{ monitor, close }} id={current.id} />
      {/key}
    </gtkbox>
  </gtkoverlay>
{:else}
  <gtkbox width={0} height={0} input></gtkbox>
{/if}
