<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { monitorSizeOf } from '../../lib/placement'
  import { recordOf, stringOf } from '../../lib/record'
  import { MAX_UNIT_PX, sizePx, spanOf } from './grid'
  import WidgetPreview from './WidgetPreview.svelte'
  import { widgetDragText } from './widgetDrag'

  // The widget gallery: a frosted panel that rises in the bottom-left corner
  // and lists every widget the installed extensions declare, by category, as
  // live previews close to the size they will have. Opening it shows the
  // desktop (the reveal backend hears widgets:gallery); Done puts the windows
  // back.
  //
  // A tile is dragged onto the desktop, or clicked to have the desktop gather
  // it with the other widgets. The panel and the desktop are two layer-shell
  // windows, which a pointer grab does not cross, so the drag is a Wayland
  // one carrying the widget's type as text (widgetDrag.ts).
  //
  // While closed the panel draws nothing that takes input, so the corner of
  // the screen stays click-through.

  const PREVIEW_SCALE = 0.72
  const ALL = 'All Widgets'
  const ALL_ICON = 'view-app-grid-symbolic'
  const FALLBACK_ICON = 'application-x-addon-symbolic'
  const WIDTH_FRACTION = 0.62
  const HEIGHT_FRACTION = 0.56
  const FALLBACK_SIZE = { width: 1190, height: 600 }
  const SIDEBAR_WIDTH = 220
  const FADE_MS = 200

  interface CatalogEntry {
    type: string
    name: string
    category: string
    description: string
    icon: string
    defaultSize: string
    // The installed program it comes from, or '' for the shell's own.
    source: string
  }

  interface Category {
    name: string
    icon: string
  }

  interface Section {
    name: string
    entries: CatalogEntry[]
  }

  let { bus, registry, args }: ViewProps = $props()

  // The monitor this gallery is on: its size is the gallery's, and a widget
  // added here lands on that monitor's desktop.
  const monitor = $derived(stringOf(recordOf(args).monitor))

  let open = $state(false)
  let catalog = $state<CatalogEntry[]>([])
  let category = $state(ALL)
  let query = $state('')
  let viewport = $state(FALLBACK_SIZE)
  // The registry is outside Svelte's reactivity, so a widget provider that
  // registers after the gallery is up is picked up by bumping this.
  let generation = $state(0)

  const categories = $derived([{ name: ALL, icon: ALL_ICON }, ...categoriesOf(catalog)])
  const sections = $derived(sectionsOf(catalog, category, query))
  const panelWidth = $derived(Math.round(viewport.width * WIDTH_FRACTION))
  const panelHeight = $derived(Math.round(viewport.height * HEIGHT_FRACTION))

  $effect(() =>
    subscribeTo(bus, 'widgets:gallery', (message) => {
      open = recordOf(message.data).open === true
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'widgets.catalog', (message) => {
      catalog = entriesOf(recordOf(message.data).widgets)
    }),
  )

  // The panel is a fraction of the output, and the gallery's own window is
  // anchored to a corner — so its size comes from the compositor bridge the
  // same way the desktop's viewport does.
  $effect(() =>
    subscribeTo(bus, 'hypr.monitors', (message) => {
      applyMonitor(message.data)
    }),
  )

  $effect(() =>
    registry.onChange(() => {
      generation += 1
    }),
  )

  function applyMonitor(data: unknown): void {
    const size = monitorSizeOf(data, monitor)
    if (size === null) {
      return
    }
    viewport = size
  }

  function close(): void {
    open = false
    bus.publish('widgets:gallery', { open: false })
  }

  function add(entry: CatalogEntry): void {
    bus.publish('widgets:add', { type: entry.type, size: entry.defaultSize, monitor })
  }

  // The desktop learns what is being dragged before it is dropped, so it can
  // show where it would land (widgetDrag.ts).
  function announceDrag(entry: CatalogEntry): void {
    bus.publish('widgets:dragging', { type: entry.type, size: entry.defaultSize })
  }

  function endDrag(): void {
    bus.publish('widgets:dragging', {})
  }

  function readQuery(event: { target: { widget: { get_text(): string } } }): void {
    query = event.target.widget.get_text()
  }

  function categoriesOf(entries: CatalogEntry[]): Category[] {
    const names = [...new Set(entries.map((entry) => entry.category))].sort()
    return names.map((name) => ({ name, icon: iconOfCategory(entries, name) }))
  }

  function iconOfCategory(entries: CatalogEntry[], name: string): string {
    const withIcon = entries.find((entry) => entry.category === name && entry.icon !== '')
    if (withIcon === undefined) {
      return FALLBACK_ICON
    }
    return withIcon.icon
  }

  function sectionsOf(entries: CatalogEntry[], active: string, search: string): Section[] {
    const needle = search.trim().toLowerCase()
    const shown = entries.filter((entry) => inCategory(entry, active) && matches(entry, needle))
    const names = [...new Set(shown.map((entry) => entry.category))].sort()
    return names.map((name) => ({ name, entries: shown.filter((entry) => entry.category === name) }))
  }

  function inCategory(entry: CatalogEntry, active: string): boolean {
    if (active === ALL) {
      return true
    }
    return entry.category === active
  }

  function matches(entry: CatalogEntry, needle: string): boolean {
    if (needle === '') {
      return true
    }
    return `${entry.name} ${entry.category} ${entry.description} ${entry.source}`.toLowerCase().includes(needle)
  }

  function entriesOf(value: unknown): CatalogEntry[] {
    if (!Array.isArray(value)) {
      return []
    }
    return value.flatMap(entryOf)
  }

  function entryOf(value: unknown): CatalogEntry[] {
    const raw = recordOf(value)
    if (typeof raw.type !== 'string' || typeof raw.name !== 'string') {
      return []
    }
    return [
      {
        type: raw.type,
        name: raw.name,
        category: stringOr(raw.category, 'Other'),
        description: stringOf(raw.description),
        icon: stringOf(raw.icon),
        defaultSize: stringOr(raw.defaultSize, 'small'),
        source: stringOf(raw.source),
      },
    ]
  }

  function stringOr(value: unknown, fallback: string): string {
    if (typeof value !== 'string' || value === '') {
      return fallback
    }
    return value
  }

  function previewWidth(size: string): number {
    return Math.round(sizePx(MAX_UNIT_PX, spanOf(size)).width * PREVIEW_SCALE)
  }

  function captionOf(entry: CatalogEntry): string {
    if (entry.source === '') {
      return entry.name
    }
    return `${entry.name} · ${entry.source}`
  }

  function categoryClass(name: string, active: string): string {
    if (name === active) {
      return 'gallery-category active'
    }
    return 'gallery-category'
  }

  function panelClass(isOpen: boolean): string {
    if (isOpen) {
      return 'gallery open'
    }
    return 'gallery'
  }
</script>

<!-- Room around the panel for its shadow: the window is exactly as big as
     what it holds. -->
<gtkbox halign="start" valign="end" margin-start={16} margin-bottom={16} margin-top={48} margin-end={48}>
  <gtkrevealer reveal={open} transition="crossfade" duration={FADE_MS}>
    <gtkbox
      class={panelClass(open)}
      orientation="vertical"
      width={panelWidth}
      height={panelHeight}
      clip
      input={open}
    >
      <gtkbox orientation="horizontal" vexpand>
        <gtkbox class="gallery-sidebar" orientation="vertical" spacing={10} width={SIDEBAR_WIDTH}>
          <gtksearchentry
            class="gallery-search"
            placeholder="Search Widgets"
            text={query}
            onsearch-changed={readQuery}
          ></gtksearchentry>

          <gtkscrolledwindow hscroll="never" vexpand frame={false}>
            <gtkbox orientation="vertical" spacing={2}>
              {#each categories as entry (entry.name)}
                <gtkbutton
                  class={categoryClass(entry.name, category)}
                  frame={false}
                  onclicked={() => (category = entry.name)}
                >
                  <gtkbox orientation="horizontal" spacing={10}>
                    <gtkbox class="gallery-category-icon" valign="center">
                      <gtkicon icon={entry.icon} size={14} halign="center" valign="center" hexpand vexpand></gtkicon>
                    </gtkbox>
                    <gtklabel hexpand halign="start" ellipsize="end">{entry.name}</gtklabel>
                  </gtkbox>
                </gtkbutton>
              {/each}
            </gtkbox>
          </gtkscrolledwindow>
        </gtkbox>

        <gtkscrolledwindow class="gallery-body" hscroll="never" hexpand vexpand frame={false}>
          {#if sections.length === 0}
            <gtklabel class="gallery-empty" halign="center" valign="start">No widgets match.</gtklabel>
          {:else}
            <gtkbox orientation="vertical" spacing={22}>
              {#each sections as section (section.name)}
                <gtkbox orientation="vertical" spacing={12}>
                  <gtklabel class="gallery-section" halign="start">{section.name}</gtklabel>
                  <!-- A flow box wraps the tiles, the one container that
                       reflows in a panel whose width follows the output. -->
                  <gtkflowbox
                    class="gallery-tiles"
                    orientation="horizontal"
                    spacing={18}
                    selection="none"
                    halign="start"
                    valign="start"
                    max-per-line={8}
                  >
                    {#each section.entries as entry (entry.type)}
                      <gtkpressable
                        class="gallery-tile"
                        orientation="vertical"
                        spacing={8}
                        tooltip={entry.description}
                        drag-text={widgetDragText(entry.type)}
                        onpress={() => add(entry)}
                        ondragoutbegin={() => announceDrag(entry)}
                        ondragoutend={endDrag}
                      >
                        <WidgetPreview
                          {bus}
                          {registry}
                          {generation}
                          type={entry.type}
                          size={entry.defaultSize}
                          width={previewWidth(entry.defaultSize)}
                        />
                        <gtklabel class="gallery-tile-name" halign="center" ellipsize="end">
                          {captionOf(entry)}
                        </gtklabel>
                      </gtkpressable>
                    {/each}
                  </gtkflowbox>
                </gtkbox>
              {/each}
            </gtkbox>
          {/if}
        </gtkscrolledwindow>
      </gtkbox>

      <gtkbox class="gallery-footer" orientation="horizontal" spacing={12}>
        <gtklabel class="gallery-hint" hexpand halign="start" valign="center">
          Drag a widget onto the desktop, or click it to add it.
        </gtklabel>
        <gtkbutton class="gallery-done" frame={false} valign="center" onclicked={close}>Done</gtkbutton>
      </gtkbox>
    </gtkbox>
  </gtkrevealer>
</gtkbox>
