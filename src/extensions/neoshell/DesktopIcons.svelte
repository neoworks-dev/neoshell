<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import { rectOf } from './freeform'
  import type { Point, Rect } from './freeform'
  import type { DesktopEntry, DesktopStore, MenuItem } from './desktopStore.svelte'
  import type { BusService } from '../../lib/bus'
  import {
    dragOf,
    extendsSelection,
    pressOf,
    PRIMARY_BUTTON,
    SECONDARY_BUTTON,
  } from './gestures'

  // The desktop folder's contents, placed free-form. A drag behaves the way a
  // Finder desktop does: the selection is picked up as translucent copies that
  // follow the pointer exactly, the originals stay where they are, and only the
  // drop is snapped — to the screen edges and to whatever is already there —
  // with the icons gliding from where they were let go to where they settle.
  //
  // Each icon is an overlay child of the desktop pushed into place by margins.
  // The host does the moving (`carry`): the selected icons themselves follow
  // the pointer, drawn as the translucent copies, while plain copies stand in
  // at the points they left. Dropped, they glide from where they were let go
  // to the points this view gives them — or jump back, when it refuses.
  //
  // Icon art comes from the icon theme by freedesktop name; an image file shows
  // itself, through the picture handle desktop.entries carries for it. Every
  // file operation goes through desktop:*, which only acts on what the
  // desktop shows.

  const CALL_TIMEOUT_MS = 10000
  const DRAG_THRESHOLD_PX = 4
  const GLIDE_MS = 180
  const ICON_PIXELS = 48

  interface Drag {
    moved: boolean
    paths: string[]
    // The icon the pointer actually holds. It is the one whose landing is
    // snapped; the rest of the selection follows by the same delta so the
    // shape is kept.
    leadPath: string
  }

  interface Handler {
    id: string
    name: string
  }

  let { bus, store }: { bus: BusService; store: DesktopStore } = $props()

  const instanceId = $props.id()
  const carryGroup = `desktop-icons-${instanceId}`

  let drag = $state<Drag | null>(null)
  // A refused drop jumps back instead of gliding: nothing moved, as far as
  // the desktop is concerned.
  let snapBack = $state(false)
  let renameDraft = $state('')
  // Whether the most recent drag travelled. The release that ends it arrives
  // as a press too, and a press after a move must not reselect.
  let lastDragMoved = false

  $effect(() =>
    subscribeTo(bus, 'desktop.entries', (message) => {
      store.applyDesktopFolder(message.data)
    }),
  )

  const leftBehind = $derived(leftBehindEntries(drag))
  const carry = $derived(carryOf(store.desktopLocked))
  const glideMs = $derived(glideOf(snapBack))

  function leftBehindEntries(current: Drag | null): DesktopEntry[] {
    if (current === null || !current.moved) {
      return []
    }
    return store.sortedEntries.filter((entry) => current.paths.includes(entry.path))
  }

  function carryOf(locked: boolean): string {
    if (locked) {
      return ''
    }
    return carryGroup
  }

  function glideOf(snapping: boolean): number {
    if (snapping) {
      return 0
    }
    return GLIDE_MS
  }

  // The selection is what a drag carries.
  function carriedByOf(path: string): string {
    if (store.isSelected(path)) {
      return carryGroup
    }
    return ''
  }

  function pointOf(entry: DesktopEntry): Point {
    const point = store.iconPoint(entry.path)
    if (point === undefined) {
      return { x: 0, y: 0 }
    }
    return point
  }

  function open(entry: DesktopEntry): void {
    void bus.call('desktop:open',{ path: entry.path }, CALL_TIMEOUT_MS)
  }

  function openSelection(): void {
    for (const path of store.selection) {
      void bus.call('desktop:open',{ path }, CALL_TIMEOUT_MS)
    }
  }

  // A press is the whole click vocabulary: primary selects, primary twice
  // opens, ctrl-primary toggles, secondary opens the menu. GTK reports them
  // all through one gesture, on release.
  function handlePress(entry: DesktopEntry, event: { detail: unknown }): void {
    const press = pressOf(event)
    if (press.button === SECONDARY_BUTTON) {
      void openMenu(entry, press.x, press.y)
      return
    }
    if (press.button !== PRIMARY_BUTTON || dragMoved()) {
      return
    }
    if (press.count >= 2) {
      open(entry)
      return
    }
    if (extendsSelection(press)) {
      store.toggleSelected(entry.path)
      return
    }
    // A plain click on one of several selected icons narrows the selection
    // to it — on release, so the press could still have dragged them all.
    store.selectOnly(entry.path)
  }

  function dragMoved(): boolean {
    if (drag !== null) {
      return drag.moved
    }
    return lastDragMoved
  }

  // The press picks the icon up: an unselected one becomes the selection, a
  // selected one keeps the selection it is part of so the drag moves it all.
  function startDrag(entry: DesktopEntry, event: { detail: unknown }): void {
    lastDragMoved = false
    if (!store.isSelected(entry.path)) {
      pickUp(entry, extendsSelection(dragOf(event)))
    }
    if (store.desktopLocked) {
      return
    }
    snapBack = false
    drag = { moved: false, paths: [...store.selection], leadPath: entry.path }
  }

  function pickUp(entry: DesktopEntry, extend: boolean): void {
    if (extend) {
      store.toggleSelected(entry.path)
      return
    }
    store.selectOnly(entry.path)
  }

  function moveDrag(event: { detail: unknown }): void {
    if (drag === null || drag.moved || !dragOf(event).carried) {
      return
    }
    drag = { ...drag, moved: true }
  }

  function endDrag(event: { detail: unknown }): void {
    if (drag === null) {
      return
    }
    const finished = drag
    drag = null
    const loose = dragOf(event)
    lastDragMoved = finished.moved || loose.carried
    if (lastDragMoved) {
      dropDrag(finished, { x: loose.dx, y: loose.dy })
    }
  }

  // The lead icon's landing is snapped, and the delta that snap settled on is
  // what the whole selection moves by, so the selection keeps its shape. A
  // landing on something taken is refused and the icons go back.
  function dropDrag(finished: Drag, loose: Point): void {
    const delta = settledDelta(finished, loose)
    const targets = new Map<string, Point>()
    for (const path of finished.paths) {
      addTarget(targets, path, delta)
    }
    if (!store.moveIcons(finished.paths, targets)) {
      snapBack = true
    }
  }

  function settledDelta(finished: Drag, loose: Point): Point {
    const lead = store.iconPoint(finished.leadPath)
    if (lead === undefined) {
      return loose
    }
    const target = { x: lead.x + loose.x, y: lead.y + loose.y }
    const landing = store.landingFor(target, store.layout.iconSize, draggedRects(finished))
    return { x: landing.x - lead.x, y: landing.y - lead.y }
  }

  function draggedRects(finished: Drag): Rect[] {
    return finished.paths.flatMap((path) => {
      const point = store.iconPoint(path)
      if (point === undefined) {
        return []
      }
      return [rectOf(point, store.layout.iconSize)]
    })
  }

  function addTarget(targets: Map<string, Point>, path: string, delta: Point): void {
    const point = store.iconPoint(path)
    if (point === undefined) {
      return
    }
    targets.set(path, { x: point.x + delta.x, y: point.y + delta.y })
  }

  // The press coordinates are relative to the icon, and the menu is placed
  // against the desktop — so the icon's own point is added back.
  async function openMenu(entry: DesktopEntry, x: number, y: number): Promise<void> {
    if (!store.isSelected(entry.path)) {
      store.selectOnly(entry.path)
    }
    const point = pointOf(entry)
    store.openMenu(point.x + x, point.y + y, await iconMenu(entry))
  }

  async function iconMenu(entry: DesktopEntry): Promise<MenuItem[]> {
    const count = store.selection.size
    return [
      { label: openLabel(count), action: openSelection },
      { label: 'Open With', children: await handlerItems(entry) },
      { separator: true },
      { label: 'Rename', disabled: count > 1, action: () => beginRename(entry) },
      { label: trashLabel(count), danger: true, action: trashSelection },
    ]
  }

  function openLabel(count: number): string {
    if (count > 1) {
      return `Open ${count} items`
    }
    return 'Open'
  }

  function trashLabel(count: number): string {
    if (count > 1) {
      return `Move ${count} items to Trash`
    }
    return 'Move to Trash'
  }

  async function handlerItems(entry: DesktopEntry): Promise<MenuItem[]> {
    const reply = await bus.call('desktop:handlers', { path: entry.path }, CALL_TIMEOUT_MS)
    const handlers = handlersOf(reply)
    if (handlers.length === 0) {
      return [{ label: 'No applications found', disabled: true }]
    }
    return handlers.map((handler) => ({
      label: handler.name,
      action: () => {
        void bus.call('desktop:openwith', { path: entry.path, handler: handler.id }, CALL_TIMEOUT_MS)
      },
    }))
  }

  function handlersOf(reply: unknown): Handler[] {
    if (typeof reply !== 'object' || reply === null) {
      return []
    }
    const handlers = (reply as { handlers?: unknown }).handlers
    if (!Array.isArray(handlers)) {
      return []
    }
    return handlers as Handler[]
  }

  function beginRename(entry: DesktopEntry): void {
    renameDraft = entry.name
    store.renamingPath = entry.path
  }

  function commitRename(entry: DesktopEntry): void {
    const name = renameDraft.trim()
    store.renamingPath = ''
    if (name === '' || name === entry.name) {
      return
    }
    void bus.call('desktop:rename', { path: entry.path, name }, CALL_TIMEOUT_MS)
  }

  function trashSelection(): void {
    void bus.call('desktop:trash', { paths: [...store.selection] }, CALL_TIMEOUT_MS)
    store.clearSelection()
  }

  function tileClass(path: string): string {
    if (drag !== null && drag.moved && drag.paths.includes(path)) {
      return 'desktop-icon ghost'
    }
    if (store.isSelected(path)) {
      return 'desktop-icon selected'
    }
    return 'desktop-icon'
  }
</script>

{#snippet art(entry: DesktopEntry)}
  {#if entry.thumbnail !== ''}
    <gtkpicture
      class="desktop-icon-art"
      handle={entry.thumbnail}
      fit="contain"
      width={ICON_PIXELS}
      height={ICON_PIXELS}
      halign="center"
    ></gtkpicture>
  {:else}
    <gtkicon class="desktop-icon-art" icon={entry.icon} size={ICON_PIXELS} halign="center"></gtkicon>
  {/if}
{/snippet}

{#snippet caption(entry: DesktopEntry)}
  <gtklabel class="desktop-icon-label" wrap lines={2} ellipsize="end" justify="center">
    {entry.name}
  </gtklabel>
{/snippet}

<!-- What stays at the points the carried icons left. The press keeps an
     implicit grab on the icon it began on, so these never take an event. -->
{#each leftBehind as entry (entry.path)}
  {@const point = pointOf(entry)}
  <gtkbox
    overlay
    class="desktop-icon selected"
    orientation="vertical"
    spacing={4}
    halign="start"
    valign="start"
    margin-start={point.x}
    margin-top={point.y}
    width={store.layout.iconSize.width}
    height={store.layout.iconSize.height}
  >
    {@render art(entry)}
    {@render caption(entry)}
  </gtkbox>
{/each}

{#each store.sortedEntries as entry (entry.path)}
  {@const point = pointOf(entry)}
  <gtkpressable
    overlay
    class={tileClass(entry.path)}
    orientation="vertical"
    spacing={4}
    halign="start"
    valign="start"
    margin-start={point.x}
    margin-top={point.y}
    width={store.layout.iconSize.width}
    height={store.layout.iconSize.height}
    tooltip={entry.name}
    {carry}
    carry-threshold={DRAG_THRESHOLD_PX}
    carried-by={carriedByOf(entry.path)}
    glide={glideMs}
    onpress={(event) => handlePress(entry, event)}
    ondragstart={(event) => startDrag(entry, event)}
    ondragmove={moveDrag}
    ondragend={endDrag}
  >
    {@render art(entry)}

    {#if store.renamingPath === entry.path}
      <gtkentry
        class="desktop-icon-rename"
        text={renameDraft}
        xalign={0.5}
        onchanged={(event) => (renameDraft = event.target.widget.get_text())}
        onactivate={() => commitRename(entry)}
      ></gtkentry>
    {:else}
      {@render caption(entry)}
    {/if}
  </gtkpressable>
{/each}
