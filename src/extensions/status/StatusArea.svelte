<script lang="ts">
  import type Gtk from 'gi://Gtk?version=4.0'
  import type { BusService } from '../../lib/bus'
  import { subscribeTo } from '../../lib/bus'
  import { recordOf, stringOf } from '../../lib/record'
  import type { ViewRegistry } from '../../host/plugins/views'
  import { resolve } from '../../tree'
  import { statusItemsOf } from './statusItems'
  import type { StatusItem } from './statusItems'

  // The bar's status area: one button per declared status item, drawing the
  // item's icon view. A click asks the menu host on this monitor to open the
  // item's menu under it.

  let {
    bus,
    registry,
    monitor,
  }: {
    bus: BusService
    registry: ViewRegistry
    // The bar's connector; menus open on the same monitor.
    monitor: string
  } = $props()

  let items = $state<StatusItem[]>([])
  let openId = $state('')
  // The `when` topics that have published, so their items show.
  let readyTopics = $state<ReadonlySet<string>>(new Set())
  // The registry is outside Svelte's reactivity; a view registering late is
  // picked up by bumping this.
  let generation = $state(0)

  $effect(() =>
    subscribeTo(bus, 'status.catalog', (message) => {
      items = statusItemsOf(recordOf(message.data).items)
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'status.open', (message) => {
      const record = recordOf(message.data)
      openId = openIdOn(stringOf(record.id), stringOf(record.monitor))
    }),
  )

  $effect(() =>
    registry.onChange(() => {
      generation += 1
    }),
  )

  $effect(() => {
    const stops = whenTopicsOf(items).map((topic) => subscribeTo(bus, topic, () => markReady(topic)))
    return () => stops.forEach((stop) => stop())
  })

  function whenTopicsOf(declared: StatusItem[]): string[] {
    const topics = declared.map((item) => item.when).filter((topic) => topic !== '')
    return [...new Set(topics)]
  }

  function markReady(topic: string): void {
    if (readyTopics.has(topic)) {
      return
    }
    readyTopics = new Set(readyTopics).add(topic)
  }

  function isShown(item: StatusItem, ready: ReadonlySet<string>): boolean {
    return item.when === '' || ready.has(item.when)
  }

  function openIdOn(id: string, openMonitor: string): string {
    if (openMonitor !== monitor) {
      return ''
    }
    return id
  }

  function toggle(item: StatusItem, widget: Gtk.Widget): void {
    if (item.menu === '') {
      return
    }
    bus.publish('status:toggle', { id: item.id, monitor, anchorEnd: anchorEndOf(widget) })
  }

  function anchorEndOf(widget: Gtk.Widget): number {
    const root = widget.get_root() as Gtk.Widget | null
    if (root === null) {
      return 0
    }
    const [found, bounds] = widget.compute_bounds(root)
    if (!found) {
      return 0
    }
    return Math.max(0, root.get_width() - (bounds.get_x() + bounds.get_width()))
  }

  function itemClass(item: StatusItem, currentOpenId: string): string {
    if (item.id === currentOpenId) {
      return 'status-item status-item-open'
    }
    return 'status-item'
  }
</script>

<gtkbox class="status-area" orientation="horizontal" spacing={2} valign="center">
  {#each items as item (item.id)}
    {@const Icon = resolve(registry, item.icon, generation)}
    {#if Icon !== undefined && isShown(item, readyTopics)}
      <gtkbutton
        class={itemClass(item, openId)}
        frame={false}
        tooltip={item.label}
        onclicked={(event: { target: { widget: Gtk.Widget } }) => toggle(item, event.target.widget)}
      >
        <Icon {bus} {registry} args={{ monitor }} id={item.id} />
      </gtkbutton>
    {/if}
  {/each}
</gtkbox>
