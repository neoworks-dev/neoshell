import { ICON_SPAN, clampCell, gridOf, nearestCell, sameCell, spanOf } from './grid'
import type { Cell, Grid, Point, Viewport } from './grid'
import {
  entriesOf,
  iconCellsOf,
  iconKey,
  instancesOf,
  nextWidgetId,
  resolveLayout,
  sameCells,
  seedsOf,
  sorted,
  storedIconCellsOf,
  widgetKey,
} from './desktopLayout'
import type { DesktopEntry, Layout, WidgetPlacement, WidgetSeed } from './desktopLayout'
import { recordOf } from '../../lib/record.js'
import { valueAt } from '../../lib/settings.svelte.js'
import type { BusService as BusLike } from '../../lib/bus.js'

// DesktopStore is the desktop's reactive state: the folder's entries, what is
// selected, which widgets exist, the open context menu, and the config writes
// that persist any of it. Where things actually sit is decided by
// desktopLayout, which both the icons and the widget canvas resolve against —
// one desktop, one answer.
//
// Icons and widgets share one grid, and config holds their cells. A drag pins
// what it carries to the cells under it (previewDrop), which moves everything
// in the way aside on screen; the drop writes every cell that arrangement
// gave (commitDrop). A drop is never refused.
//
// Config is also the record of which widgets exist: widgets.<id> carries the
// type, so the gallery can add one and the context menu can remove it. The
// view tree's seed only applies to a desktop that has never been arranged.
//
// A desktop on a monitor other than the main one holds widgets only: the
// folder's icons stay on the main display, and its widgets live under
// desktop.screens.<connector>.widgets so two desktops never write one map.
//
// Writes are debounced because a resolve settles in several steps (the folder
// arrives, then the config), and only the settled answer is worth storing.

export interface MenuItem {
  label?: string
  separator?: boolean
  checked?: boolean
  danger?: boolean
  disabled?: boolean
  action?: () => void
  children?: MenuItem[]
}

export interface MenuState {
  x: number
  y: number
  items: MenuItem[]
}

export type { DesktopEntry, WidgetPlacement }

const CALL_TIMEOUT_MS = 10000
const PERSIST_DEBOUNCE_MS = 250
const MAIN_WIDGETS_KEY = 'widgets'
const NO_PINS: ReadonlyMap<string, Cell> = new Map()

export class DesktopStore {
  entries = $state<DesktopEntry[]>([])
  desktopDir = $state('')
  selection = $state<ReadonlySet<string>>(new Set())
  menu = $state<MenuState | null>(null)
  renamingPath = $state('')
  viewportWidth = $state(1920)
  viewportHeight = $state(1080)
  desktopLocked = $state(false)
  sortMode = $state('name')
  // The widget gallery is open: widgets show their remove badge.
  editing = $state(false)

  private storedIcons = $state<Record<string, Cell>>({})
  // Replaced whole, never changed in place.
  private pins = $state<ReadonlyMap<string, Cell>>(NO_PINS)
  private storedWidgets = $state<Record<string, Record<string, unknown>> | null>(null)
  private seeds = $state<WidgetSeed[]>([])
  private folderLoaded = $state(false)
  private readonly listeners = new Set<() => void>()
  private readonly bus: BusLike
  private persistTimer: ReturnType<typeof setTimeout> | null = null
  private widgetsKey = $state(MAIN_WIDGETS_KEY)
  private showsIcons = $state(true)
  private lastSnapshot: unknown = {}

  constructor(bus: BusLike) {
    this.bus = bus
  }

  readonly viewport: Viewport = $derived({
    width: this.viewportWidth,
    height: this.viewportHeight,
  })

  readonly grid: Grid = $derived(gridOf(this.viewport))

  // The files extension already returns folders first and then names; a sort
  // mode reorders that, and because icons flow in this order it is also the
  // order a clean-up lays them out in.
  readonly sortedEntries: DesktopEntry[] = $derived(sorted(this.entries, this.sortMode))

  readonly layout: Layout = $derived(
    resolveLayout({
      entries: this.sortedEntries,
      storedIcons: this.storedIcons,
      instances: instancesOf(this.storedWidgets, this.seeds, this.grid),
      viewport: this.viewport,
      pins: this.pins,
    }),
  )

  // onChange lets the widget canvas — plain DOM, outside Svelte's reactivity —
  // reconcile its instances whenever the layout changes.
  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setViewport(width: number, height: number): void {
    this.viewportWidth = width
    this.viewportHeight = height
    this.notify()
  }

  // Which monitor's desktop this is; see the top of the file.
  setMonitor(connector: string, isMain: boolean): void {
    this.showsIcons = isMain
    this.widgetsKey = widgetsKeyFor(connector, isMain)
    this.applyConfig(this.lastSnapshot)
  }

  // The seed is the desktop node's args, so it arrives with the view rather
  // than over the bus.
  setSeeds(value: unknown): void {
    this.seeds = seedsOf(value)
    this.notify()
  }

  applyDesktopFolder(data: unknown): void {
    const record = recordOf(data)
    if (typeof record.path === 'string') {
      this.desktopDir = record.path
    }
    this.entries = entriesOf(record.entries)
    this.folderLoaded = true
    this.pruneSelection()
  }

  applyConfig(snapshot: unknown): void {
    this.lastSnapshot = snapshot
    const root = recordOf(snapshot)
    const desktop = recordOf(root.desktop)
    this.storedIcons = this.storedIconsOf(root.icons)
    this.storedWidgets = storedWidgetsOf(valueAt(root, this.widgetsKey))
    this.desktopLocked = desktop.locked === true
    this.sortMode = sortModeOf(desktop.sort)
    this.notify()
  }

  widgetPlacement(id: string): WidgetPlacement | undefined {
    return this.layout.widgets.get(id)
  }

  widgetPlacements(): WidgetPlacement[] {
    return [...this.layout.widgets.values()]
  }

  iconPoint(path: string): Point | undefined {
    return this.layout.icons.get(path)
  }

  isSelected(path: string): boolean {
    return this.selection.has(path)
  }

  // Selection follows the usual desktop chords: a plain click replaces it,
  // ctrl toggles one entry, and a rubber band replaces it with what it caught.
  selectOnly(path: string): void {
    this.selection = new Set([path])
  }

  toggleSelected(path: string): void {
    const next = new Set(this.selection)
    if (!next.delete(path)) {
      next.add(path)
    }
    this.selection = next
  }

  selectPaths(paths: Iterable<string>): void {
    this.selection = new Set(paths)
  }

  clearSelection(): void {
    this.selection = new Set()
  }

  selectAll(): void {
    this.selection = new Set(this.entries.map((entry) => entry.path))
  }

  openMenu(x: number, y: number, items: MenuItem[]): void {
    this.menu = { x, y, items }
  }

  closeMenu(): void {
    this.menu = null
  }

  openGallery(): void {
    this.bus.publish('widgets:gallery', { open: true })
  }

  /** Pins what a drag carries to the cells under it; everything in the way moves aside on screen. */
  previewDrop(pins: ReadonlyMap<string, Cell>): void {
    if (samePins(pins, this.pins)) {
      return
    }
    this.pins = pins
  }

  cancelDrop(): void {
    this.pins = NO_PINS
  }

  /** Drops the pinned items: every cell the arrangement gives is written, the neighbours' too. */
  commitDrop(pins: ReadonlyMap<string, Cell>): void {
    this.pins = pins
    const cells = this.layout.droppedCells
    this.writeCells(cells)
    this.pins = NO_PINS
  }

  /** The cell a widget dragged so its origin is at `point` would take. */
  widgetCellAt(id: string, point: Point): Cell | undefined {
    const placement = this.layout.widgets.get(id)
    if (placement === undefined) {
      return undefined
    }
    return nearestCell(this.grid, point, spanOf(placement.size))
  }

  /**
   * Where the dragged icons go: the held icon to the cell nearest under it,
   * the rest of the selection by the same number of cells, so it keeps its
   * shape.
   */
  iconPinsFor(paths: string[], leadPath: string, travel: Point): Map<string, Cell> {
    const pins = new Map<string, Cell>()
    const lead = this.layout.cells.get(iconKey(leadPath))
    if (lead === undefined) {
      return pins
    }
    const leadPoint = this.layout.icons.get(leadPath)
    if (leadPoint === undefined) {
      return pins
    }
    const target = nearestCell(this.grid, { x: leadPoint.x + travel.x, y: leadPoint.y + travel.y }, ICON_SPAN)
    for (const path of paths) {
      addShiftedPin(pins, this.layout.cells, path, target, lead, this.grid)
    }
    return pins
  }

  setWidgetLocked(id: string, locked: boolean): void {
    this.patchWidget(id, { locked })
  }

  // A widget that grows keeps its corner; whatever it now covers moves aside.
  setWidgetSize(id: string, size: string): void {
    const placement = this.layout.widgets.get(id)
    this.patchWidget(id, { size })
    if (placement !== undefined) {
      this.commitDrop(new Map([[widgetKey(id), placement.cell]]))
    }
  }

  // A widget dragged out of the gallery carries the point it was dropped on,
  // and lands there like any drop; one added without one gathers with the
  // other widgets from the top-right.
  addWidget(type: string, size: string, point?: Point): string {
    const current = this.instanceRecords()
    const id = nextWidgetId(type, new Set(Object.keys(current)))
    this.writeWidgets({ ...current, [id]: { type, size, locked: false } })
    if (point !== undefined) {
      this.commitDrop(new Map([[widgetKey(id), nearestCell(this.grid, point, spanOf(size))]]))
    }
    return id
  }

  // Removing a widget deletes its entry outright. Config is the record of what
  // exists, so there is nothing left to hide it from.
  removeWidget(id: string): void {
    const next = { ...this.instanceRecords() }
    delete next[id]
    this.writeWidgets(next)
  }

  setDesktopLocked(locked: boolean): void {
    this.desktopLocked = locked
    void this.bus.call('config:set', { key: 'desktop.locked', value: locked }, CALL_TIMEOUT_MS)
  }

  // A widget is always draggable; locking one, or the desktop, is the only way
  // to pin it. Nothing is lost to a stray press — a drag has to travel before
  // it is one, and until then the press belongs to the widget.
  widgetDraggable(id: string): boolean {
    const placement = this.layout.widgets.get(id)
    if (placement === undefined) {
      return false
    }
    return !this.desktopLocked && !placement.locked
  }

  // Sorting and cleaning up both drop every stored point: the next resolve then
  // flows the whole folder back into reading order.
  sortIcons(mode: string): void {
    this.sortMode = mode
    void this.bus.call('config:set', { key: 'desktop.sort', value: mode }, CALL_TIMEOUT_MS)
    this.cleanUpIcons()
  }

  cleanUpIcons(): void {
    this.storedIcons = {}
    this.writeIcons({})
  }

  // schedulePersist takes the layout as an argument so the caller's effect
  // tracks it; the write itself runs off the effect, after the resolve has
  // stopped moving.
  schedulePersist(layout: Layout): void {
    this.cancelPersist()
    if ((this.showsIcons && !this.folderLoaded) || this.pins.size > 0) {
      return
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      this.persist(layout)
    }, PERSIST_DEBOUNCE_MS)
  }

  cancelPersist(): void {
    if (this.persistTimer === null) {
      return
    }
    clearTimeout(this.persistTimer)
    this.persistTimer = null
  }

  // instanceRecords is config's widget map, or the resolved seed the first time
  // anything writes to it — materialising the seed is what hands ownership of
  // the list from the view tree to config.
  private instanceRecords(): Record<string, Record<string, unknown>> {
    if (this.storedWidgets !== null) {
      return this.storedWidgets
    }
    const records: Record<string, Record<string, unknown>> = {}
    for (const placement of this.layout.widgets.values()) {
      records[placement.id] = recordFor(placement)
    }
    return records
  }

  // The resolved cells are written back so what the desktop placed itself —
  // seeded, flowed in, or displaced off a stale cell — survives a restart the
  // same way a dragged item does.
  private persist(layout: Layout): void {
    this.writeCells(layout.cells)
  }

  private writeCells(cells: Map<string, Cell>): void {
    if (this.showsIcons) {
      this.writeIconCells(iconCellsOf(this.sortedEntries, cells))
    }
    this.writeWidgetCells(cells)
  }

  private storedIconsOf(value: unknown): Record<string, Cell> {
    if (!this.showsIcons) {
      return {}
    }
    return storedIconCellsOf(value, this.grid)
  }

  private writeIconCells(cells: Record<string, Cell>): void {
    if (sameCells(cells, this.storedIcons)) {
      return
    }
    this.storedIcons = cells
    this.writeIcons(cells)
  }

  private writeWidgetCells(cells: Map<string, Cell>): void {
    const next = { ...this.instanceRecords() }
    let changed = this.storedWidgets === null
    for (const id of Object.keys(next)) {
      changed = stageWidgetCell(next, id, cells.get(widgetKey(id))) || changed
    }
    if (changed) {
      this.writeWidgets(next)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  private patchWidget(id: string, patch: Record<string, unknown>): void {
    const current = this.instanceRecords()
    const merged = { ...current[id], ...patch }
    this.writeWidgets({ ...current, [id]: merged })
  }

  private writeWidgets(next: Record<string, Record<string, unknown>>): void {
    this.storedWidgets = next
    void this.bus.call('config:set', { key: this.widgetsKey, value: next }, CALL_TIMEOUT_MS)
    this.notify()
  }

  // Cells are written as whole maps: config:set addresses keys by dot-path,
  // and a file path as a key would explode into one nested object per segment.
  private writeIcons(cells: Record<string, Cell>): void {
    void this.bus.call('config:set', { key: 'icons', value: cells }, CALL_TIMEOUT_MS)
    this.notify()
  }

  private pruneSelection(): void {
    const live = new Set(this.entries.map((entry) => entry.path))
    const next = new Set([...this.selection].filter((path) => live.has(path)))
    if (next.size !== this.selection.size) {
      this.selection = next
    }
  }
}

function widgetsKeyFor(connector: string, isMain: boolean): string {
  if (isMain || connector === '') {
    return MAIN_WIDGETS_KEY
  }
  return `desktop.screens.${connector}.widgets`
}

function recordFor(placement: WidgetPlacement): Record<string, unknown> {
  return {
    type: placement.type,
    size: placement.size,
    locked: placement.locked,
    column: placement.cell.column,
    row: placement.cell.row,
  }
}

// A widget stored before the grid kept pixel points; writing its cell drops
// them, so the migration finishes on disk rather than being redone on every
// read.
function stageWidgetCell(
  next: Record<string, Record<string, unknown>>,
  id: string,
  cell: Cell | undefined,
): boolean {
  const stored = next[id]
  if (cell === undefined || stored === undefined) {
    return false
  }
  if (stored.column === cell.column && stored.row === cell.row && stored.x === undefined) {
    return false
  }
  const { x: _x, y: _y, ...rest } = stored
  next[id] = { ...rest, column: cell.column, row: cell.row }
  return true
}

function addShiftedPin(
  pins: Map<string, Cell>,
  cells: Map<string, Cell>,
  path: string,
  target: Cell,
  lead: Cell,
  grid: Grid,
): void {
  const cell = cells.get(iconKey(path))
  if (cell === undefined) {
    return
  }
  const shifted = { column: cell.column + target.column - lead.column, row: cell.row + target.row - lead.row }
  pins.set(iconKey(path), clampCell(grid, shifted, ICON_SPAN))
}

function samePins(left: ReadonlyMap<string, Cell>, right: ReadonlyMap<string, Cell>): boolean {
  if (left.size !== right.size) {
    return false
  }
  return [...left].every(([key, cell]) => sameCell(cell, right.get(key)))
}

function storedWidgetsOf(value: unknown): Record<string, Record<string, unknown>> | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const widgets: Record<string, Record<string, unknown>> = {}
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    widgets[id] = recordOf(raw)
  }
  return widgets
}

function sortModeOf(value: unknown): string {
  if (value === 'type') {
    return 'type'
  }
  return 'name'
}
