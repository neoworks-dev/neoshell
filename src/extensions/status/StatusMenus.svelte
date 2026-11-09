<script lang="ts">
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { Displays } from '../../lib/displays.svelte'
  import { numberOf, recordOf } from '../../lib/record'
  import type { ViewProps } from '../../host/plugins/views'
  import { anchorOf, exclusiveZoneOf, keyboardOf, layerOf, resolve } from '../../tree'
  import { NO_MENU, openMenuOf, statusItemsOf } from './statusItems'
  import type { OpenMenu, StatusItem } from './statusItems'

  // The menu host: the one dropdown box every status item's menu is drawn in,
  // hanging under the item's icon. It is a detached node: the window exists
  // only while a menu is open, on the monitor whose bar opened it, so a closed
  // host holds no full-output surface. The window spans the output; a
  // backdrop under the box takes any click elsewhere and closes it.
  //
  //   args.offsetTop   the bar's height plus the gap the box hangs below it
  //   args.layer, args.anchors, args.keyboard   the window's layer-shell setup

  const EDGE_GAP = 6
  // Matches .status-menu-closing's animation in style.css.
  const CLOSE_ANIMATION_MS = 120

  let { bus, registry, args, id }: ViewProps = $props()

  const displays = new Displays()

  const windowArgs = $derived(recordOf(args))
  const offsetTop = $derived(numberOf(windowArgs.offsetTop, 36))

  let items = $state<StatusItem[]>([])
  let current = $state<OpenMenu>(NO_MENU)
  let closing = $state(false)
  let closeTimer: ReturnType<typeof setTimeout> | null = null
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

  $effect(() => displays.connect())

  // What is open is retained so each bar can mark its open icon.
  $effect(() => {
    const open = current
    return untrack(() => bus.retain('status.open', { id: open.id, monitor: open.monitor }))
  })

  // One menu at a time: a request for another item or another monitor
  // replaces the open one.
  function toggle(requested: OpenMenu): void {
    if (requested.id === current.id && requested.monitor === current.monitor) {
      close()
      return
    }
    cancelClosing()
    current = requested
  }

  // The box rolls back up first (.status-menu-closing), then the menu goes.
  function close(): void {
    if (current.id === '' || closeTimer !== null) {
      return
    }
    closing = true
    closeTimer = setTimeout(() => {
      closeTimer = null
      closing = false
      current = NO_MENU
    }, CLOSE_ANIMATION_MS)
  }

  function cancelClosing(): void {
    if (closeTimer !== null) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
    closing = false
  }

  function menuClass(isClosing: boolean): string {
    if (isClosing) {
      return 'status-menu status-menu-closing'
    }
    return 'status-menu'
  }

  function menuOf(open: StatusItem | undefined, currentGeneration: number) {
    if (open === undefined || open.menu === '') {
      return undefined
    }
    return resolve(registry, open.menu, currentGeneration)
  }
</script>

<!-- A layer surface cannot change monitors, so a menu opened from another
     bar gets a new window. -->
{#if Menu !== undefined}
  {#key current.monitor}
    <gtkwindow
      class="ui-dark"
      namespace={`neoshell.${id}`}
      monitor={displays.monitorFor(current.monitor)}
      layer={layerOf(windowArgs)}
      anchor={anchorOf(windowArgs)}
      exclusive-zone={exclusiveZoneOf(windowArgs)}
      keyboard-mode={keyboardOf(windowArgs)}
      decorated={false}
    >
      <gtkoverlay hexpand vexpand>
        <gtkpressable class="menu-backdrop" hexpand vexpand input onpress={close}></gtkpressable>
        <gtkbox
          overlay
          class={menuClass(closing)}
          orientation="vertical"
          halign="end"
          valign="start"
          margin-top={offsetTop}
          margin-end={Math.max(EDGE_GAP, current.anchorEnd - EDGE_GAP)}
          input
        >
          {#key current.id}
            <gtkbox class="status-menu-content" orientation="vertical">
              <Menu {bus} {registry} args={{ monitor: current.monitor, close }} id={current.id} />
            </gtkbox>
          {/key}
        </gtkbox>
      </gtkoverlay>
    </gtkwindow>
  {/key}
{/if}
