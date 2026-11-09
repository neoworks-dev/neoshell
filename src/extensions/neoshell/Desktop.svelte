<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { monitorSizeOf } from '../../lib/placement'
  import { recordOf, stringOf } from '../../lib/record'
  import { resolve } from '../../tree'
  import ContextMenu from './ContextMenu.svelte'
  import DesktopIcons from './DesktopIcons.svelte'
  import WidgetSlot from './WidgetSlot.svelte'
  import { DesktopStore } from './desktopStore.svelte'
  import type { MenuItem } from './desktopStore.svelte'
  import type { Point } from './grid'
  import { dragOf, pressOf, SECONDARY_BUTTON } from './gestures'

  // The desktop: the background-layer view that owns everything behind the
  // windows — the desktop folder's icons and the widget grid. There is one per
  // monitor it is placed on; only the main display's shows the folder's icons.
  // Icons and widgets share one grid, so this node also owns what spans both:
  // the rubber band that selects icons, the background context menu, and the
  // widget placement both halves resolve against.
  //
  // Everything is an overlay child positioned by margins. GTK has no absolute
  // positioning and a Gtk.Fixed reads its coordinates once at insertion, so an
  // overlay child aligned to the top-left with margins is what carries a point
  // that moves.

  const CALL_TIMEOUT_MS = 10000
  const LANDING_GLIDE_MS = 120

  interface WallpaperEntry {
    name: string
    path: string
  }

  let { bus, registry, args }: ViewProps = $props()

  const store = new DesktopStore(bus)

  // The band is drawn by the host (`banded-by`); this is the same rectangle,
  // kept to select what it covers.
  const instanceId = $props.id()
  const bandGroup = `desktop-band-${instanceId}`
  let band: { x: number; y: number; width: number; height: number } | null = null
  // The release that ends a rubber band also arrives as a press on the
  // background, which must not throw the selection the band just made away.
  let bandMoved = false
  // The registry is outside Svelte's reactivity, so a widget provider that
  // registers after the desktop is up is picked up by bumping this.
  let generation = $state(0)

  // An empty connector is a desktop that was not placed by monitor at all,
  // which counts as the main one.
  const monitor = $derived(stringOf(recordOf(args).monitor))
  const isMain = $derived(recordOf(args).mainMonitor !== false)
  const WallpaperView = $derived(resolve(registry, 'neoshell.wallpaper', generation))

  $effect(() => {
    store.setMonitor(monitor, isMain)
  })

  // The view tree's seed widgets are the main desktop's; another monitor's
  // starts empty.
  $effect(() => {
    if (isMain) {
      store.setSeeds(recordOf(args).widgets)
      return
    }
    store.setSeeds([])
  })

  $effect(() =>
    subscribeTo(bus, 'config', (message) => {
      store.applyConfig(message.data)
    }),
  )

  // The desktop window is anchored to every edge, so the output's size is the
  // viewport. There is no window-resize event to bind to here; the compositor
  // bridge already publishes the geometry.
  $effect(() =>
    subscribeTo(bus, 'hypr.monitors', (message) => {
      applyMonitor(message.data)
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'widgets:add', (message) => {
      const request = recordOf(message.data)
      if (!addsHere(request)) {
        return
      }
      store.addWidget(String(request.type), String(request.size), droppedPoint(request))
    }),
  )

  $effect(() =>
    registry.onChange(() => {
      generation += 1
    }),
  )

  // Config is the desktop's state file, not just its seed: whatever the
  // resolved layout ends up being — icons the folder flowed into place, a
  // widget displaced off a stale cell — is written back once it settles.
  $effect(() => {
    store.schedulePersist(store.layout)
    return () => store.cancelPersist()
  })

  function applyMonitor(data: unknown): void {
    const size = monitorSizeOf(data, monitor)
    if (size === null) {
      return
    }
    store.setViewport(size.width, size.height)
  }

  // The gallery names the monitor it is on; a request without one is the main
  // desktop's.
  function addsHere(request: Record<string, unknown>): boolean {
    const target = stringOf(request.monitor)
    if (target === '') {
      return isMain
    }
    return target === monitor
  }

  // The gallery is a different window, so a widget dragged onto the desktop
  // arrives as coordinates rather than as a drop event. Both cover the output,
  // so the coordinates need no translation.
  function droppedPoint(request: Record<string, unknown>): Point | undefined {
    const { x, y } = request
    if (typeof x !== 'number' || typeof y !== 'number') {
      return undefined
    }
    return { x, y }
  }

  function handlePress(event: { detail: unknown }): void {
    if (bandMoved) {
      bandMoved = false
      return
    }
    const press = pressOf(event)
    store.clearSelection()
    if (press.button === SECONDARY_BUTTON) {
      void openMenu(press.x, press.y)
    }
  }

  function startBand(event: { detail: unknown }): void {
    const drag = dragOf(event)
    bandMoved = false
    store.clearSelection()
    band = { x: drag.startX, y: drag.startY, width: 0, height: 0 }
  }

  function moveBand(event: { detail: unknown }): void {
    if (band === null) {
      return
    }
    const drag = dragOf(event)
    bandMoved = true
    band = {
      x: Math.min(drag.startX, drag.x),
      y: Math.min(drag.startY, drag.y),
      width: Math.abs(drag.dx),
      height: Math.abs(drag.dy),
    }
    store.selectPaths(pathsInBand())
  }

  function endBand(): void {
    band = null
  }

  // Icon cells are known geometry, so the band is intersected against computed
  // rects rather than against measured widgets.
  function pathsInBand(): string[] {
    if (band === null) {
      return []
    }
    const hit: string[] = []
    for (const [path, point] of store.layout.icons) {
      if (intersects(point)) {
        hit.push(path)
      }
    }
    return hit
  }

  function intersects(point: Point): boolean {
    if (band === null) {
      return false
    }
    const { width, height } = store.layout.iconSize
    if (point.x + width < band.x || point.x > band.x + band.width) {
      return false
    }
    return !(point.y + height < band.y || point.y > band.y + band.height)
  }

  async function openMenu(x: number, y: number): Promise<void> {
    store.openMenu(x, y, await backgroundMenu())
  }

  async function backgroundMenu(): Promise<MenuItem[]> {
    return [
      { label: 'Edit Widgets', action: () => store.openGallery() },
      ...iconItems(),
      { separator: true },
      { label: 'Change Wallpaper', children: await wallpaperItems() },
      {
        label: 'Lock Desktop',
        checked: store.desktopLocked,
        action: () => store.setDesktopLocked(!store.desktopLocked),
      },
    ]
  }

  function iconItems(): MenuItem[] {
    if (!isMain) {
      return []
    }
    return [
      { separator: true },
      { label: 'New Folder', action: newFolder },
      { separator: true },
      {
        label: 'Sort Icons',
        children: [
          {
            label: 'By Name',
            checked: store.sortMode === 'name',
            action: () => store.sortIcons('name'),
          },
          {
            label: 'By Type',
            checked: store.sortMode === 'type',
            action: () => store.sortIcons('type'),
          },
        ],
      },
      { label: 'Clean Up Icons', action: () => store.cleanUpIcons() },
      { label: 'Select All', action: () => store.selectAll() },
    ]
  }

  async function wallpaperItems(): Promise<MenuItem[]> {
    const reply = await bus.call('desktop:wallpapers', {}, CALL_TIMEOUT_MS)
    const images = imagesOf(reply)
    if (images.length === 0) {
      return [{ label: 'No images in the wallpaper folder', disabled: true }]
    }
    return images.map((image) => ({
      label: image.name,
      action: () => {
        void bus.call('desktop:setwallpaper', { path: image.path }, CALL_TIMEOUT_MS)
      },
    }))
  }

  function imagesOf(reply: unknown): WallpaperEntry[] {
    const entries = recordOf(reply).entries
    if (!Array.isArray(entries)) {
      return []
    }
    return entries as WallpaperEntry[]
  }

  function newFolder(): void {
    void bus.call('desktop:newfolder', {}, CALL_TIMEOUT_MS)
  }

  // A widget's landing is drawn with its own corners, an icon's with a cell's.
  function landingClass(width: number): string {
    if (width > store.layout.iconSize.width) {
      return 'desktop-landing widget'
    }
    return 'desktop-landing'
  }
</script>

<gtkoverlay class="desktop" hexpand vexpand>
  <!-- The wallpaper is the overlay's main child, so it is measured and fills
       the surface: one surface per monitor instead of a wallpaper surface
       under the desktop's. Everything else is an overlay child on top of it.
       It is the host's view (it decodes images and plays video), reached
       through the registry so a desktop run as a client embeds it. -->
  {#if WallpaperView !== undefined}
    <WallpaperView {bus} {registry} {args} id="wallpaper" />
  {/if}

  <!-- The background takes the rubber band and the menu. -->
  <gtkpressable
    overlay
    class="desktop-background"
    hexpand
    vexpand
    input
    carry={bandGroup}
    carry-threshold={0}
    onpress={handlePress}
    ondragstart={startBand}
    ondragmove={moveBand}
    ondragend={endBand}
  ></gtkpressable>

  <!-- Where a drag would drop: the store's own answer, so the placeholder and
       the drop always agree. -->
  {#each store.layout.landings as landing, index (index)}
    <gtkbox
      overlay
      class={landingClass(landing.width)}
      halign="start"
      valign="start"
      margin-start={landing.x}
      margin-top={landing.y}
      width={landing.width}
      height={landing.height}
      glide={LANDING_GLIDE_MS}
    ></gtkbox>
  {/each}

  {#each store.widgetPlacements() as placement (placement.id)}
    <WidgetSlot {placement} {bus} {registry} {generation} {store} />
  {/each}

  <!-- Icons come after the widgets so a dragged icon travels over them. -->
  {#if isMain}
    <DesktopIcons {bus} {store} />
  {/if}

  <!-- The background covers the overlay from its origin, so the drag's own
       coordinates are the band's. -->
  <gtkbox overlay class="rubber-band" halign="start" valign="start" banded-by={bandGroup}></gtkbox>

  {#if store.menu !== null}
    <ContextMenu
      menu={store.menu}
      viewportWidth={store.viewportWidth}
      viewportHeight={store.viewportHeight}
      onclose={() => store.closeMenu()}
    />
  {/if}
</gtkoverlay>
