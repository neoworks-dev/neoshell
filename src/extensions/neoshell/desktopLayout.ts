import { ICON_SPAN, arrange, gridOf, nearestCell, pointOfCell, rectOf, sameCell, sizePx, spanOf } from './grid'
import type { Cell, Grid, GridItem, Point, Rect, Size, Viewport } from './grid'
import { recordOf } from '../../lib/record.js'

// Where every icon and widget sits on the desktop: one grid for both
// (grid.ts). Each keeps the cell it was put on; one pushed off by a drop takes
// the nearest free cell; icons never placed flow down from the top-left.
//
// While a drag is on, the dragged items are pinned to the cells under them.
// The layout then shows everything else where the drop would put it, so the
// neighbours move aside before the drop, while the dragged items themselves
// keep their old cells: the host is carrying them, and a placement changed
// under a carry would jump.
//
// Which widgets exist is config's answer, not the view tree's. The tree
// supplies a seed for a desktop that has never been arranged and nothing after
// that, so adding and removing widgets is something the user can do.
//
// Everything in this module is pure — the store holds the reactive state and
// the writes, and calls in here to decide what the desktop looks like.

export interface DesktopEntry {
  name: string
  path: string
  directory: boolean
  icon: string
  image: boolean
  // A picture handle for an image file's own picture, or ''.
  thumbnail: string
}

// WidgetSeed is one entry of the desktop node's args: what to put on a desktop
// that has never been arranged.
export interface WidgetSeed {
  id: string
  type: string
  size: string
}

export interface WidgetInstance {
  id: string
  type: string
  size: string
  cell?: Cell
  locked: boolean
}

export interface WidgetPlacement {
  id: string
  type: string
  size: string
  cell: Cell
  point: Point
  box: Size
  locked: boolean
}

export interface LayoutInput {
  entries: DesktopEntry[]
  storedIcons: Record<string, Cell>
  instances: WidgetInstance[]
  viewport: Viewport
  // Cells the dragged items would drop on, by item key.
  pins: ReadonlyMap<string, Cell>
}

export interface Layout {
  grid: Grid
  icons: Map<string, Point>
  widgets: Map<string, WidgetPlacement>
  iconSize: Size
  // Every item's cell as committed, and as the pinned drop would leave it.
  cells: Map<string, Cell>
  droppedCells: Map<string, Cell>
  // Where the pinned items would land: the placeholders a drag shows.
  landings: Rect[]
}

export function iconKey(path: string): string {
  return `icon:${path}`
}

export function widgetKey(id: string): string {
  return `widget:${id}`
}

export function resolveLayout(input: LayoutInput): Layout {
  const grid = gridOf(input.viewport)
  const iconSize = sizePx(grid.unit, ICON_SPAN)
  const items = gridItemsOf(input)
  const cells = arrange(grid, items, new Map())
  const droppedCells = droppedArrangement(grid, items, input.pins, cells)
  const shown = shownCells(cells, droppedCells, input.pins)
  return {
    grid,
    iconSize,
    cells,
    droppedCells,
    icons: iconPoints(input.entries, grid, shown),
    widgets: widgetPlacements(input.instances, grid, shown),
    landings: landingsOf(items, grid, input.pins, droppedCells),
  }
}

function gridItemsOf(input: LayoutInput): GridItem[] {
  const widgets: GridItem[] = input.instances.map((instance) => ({
    key: widgetKey(instance.id),
    span: spanOf(instance.size),
    cell: instance.cell,
    flow: 'widgets',
  }))
  const icons: GridItem[] = input.entries.map((entry) => ({
    key: iconKey(entry.path),
    span: ICON_SPAN,
    cell: input.storedIcons[entry.path],
    flow: 'icons',
  }))
  return [...widgets, ...icons]
}

function droppedArrangement(
  grid: Grid,
  items: GridItem[],
  pins: ReadonlyMap<string, Cell>,
  cells: Map<string, Cell>,
): Map<string, Cell> {
  if (pins.size === 0) {
    return cells
  }
  // Starting from the committed cells keeps the arrangement stable: what has
  // no stored cell yet would otherwise flow anew on every drag step.
  const committed = items.map((item) => ({ ...item, cell: cells.get(item.key) }))
  return arrange(grid, committed, pins)
}

function shownCells(
  cells: Map<string, Cell>,
  droppedCells: Map<string, Cell>,
  pins: ReadonlyMap<string, Cell>,
): Map<string, Cell> {
  const shown = new Map(droppedCells)
  for (const key of pins.keys()) {
    const committed = cells.get(key)
    if (committed !== undefined) {
      shown.set(key, committed)
    }
  }
  return shown
}

function iconPoints(entries: DesktopEntry[], grid: Grid, shown: Map<string, Cell>): Map<string, Point> {
  const points = new Map<string, Point>()
  for (const entry of entries) {
    const cell = shown.get(iconKey(entry.path))
    if (cell !== undefined) {
      points.set(entry.path, pointOfCell(grid, cell))
    }
  }
  return points
}

function widgetPlacements(
  instances: WidgetInstance[],
  grid: Grid,
  shown: Map<string, Cell>,
): Map<string, WidgetPlacement> {
  const placements = new Map<string, WidgetPlacement>()
  for (const instance of instances) {
    const cell = shown.get(widgetKey(instance.id))
    if (cell === undefined) {
      continue
    }
    placements.set(instance.id, {
      id: instance.id,
      type: instance.type,
      size: instance.size,
      locked: instance.locked,
      cell,
      point: pointOfCell(grid, cell),
      box: sizePx(grid.unit, spanOf(instance.size)),
    })
  }
  return placements
}

function landingsOf(
  items: GridItem[],
  grid: Grid,
  pins: ReadonlyMap<string, Cell>,
  droppedCells: Map<string, Cell>,
): Rect[] {
  return items.flatMap((item) => {
    const cell = droppedCells.get(item.key)
    if (!pins.has(item.key) || cell === undefined) {
      return []
    }
    return [rectOf(pointOfCell(grid, cell), sizePx(grid.unit, item.span))]
  })
}

/** The icons' cells as config stores them; rebuilding the map also prunes files that are gone. */
export function iconCellsOf(entries: DesktopEntry[], cells: Map<string, Cell>): Record<string, Cell> {
  const stored: Record<string, Cell> = {}
  for (const entry of entries) {
    const cell = cells.get(iconKey(entry.path))
    if (cell !== undefined) {
      stored[entry.path] = cell
    }
  }
  return stored
}

export function sameCells(left: Record<string, Cell>, right: Record<string, Cell>): boolean {
  const keys = Object.keys(left)
  if (keys.length !== Object.keys(right).length) {
    return false
  }
  return keys.every((key) => sameCell(left[key], right[key]))
}

// sorted keeps folders ahead of files either way — a desktop that mixes them
// reads as unsorted whatever the key is.
export function sorted(entries: DesktopEntry[], mode: string): DesktopEntry[] {
  return [...entries].sort((left, right) => compareEntries(left, right, mode))
}

function compareEntries(left: DesktopEntry, right: DesktopEntry, mode: string): number {
  if (left.directory !== right.directory) {
    return foldersFirst(left)
  }
  if (mode === 'type') {
    const byType = typeKeyOf(left).localeCompare(typeKeyOf(right))
    if (byType !== 0) {
      return byType
    }
  }
  return left.name.toLowerCase().localeCompare(right.name.toLowerCase())
}

function foldersFirst(left: DesktopEntry): number {
  if (left.directory) {
    return -1
  }
  return 1
}

function typeKeyOf(entry: DesktopEntry): string {
  const dot = entry.name.lastIndexOf('.')
  if (dot <= 0) {
    return ''
  }
  return entry.name.slice(dot + 1).toLowerCase()
}

export function storedIconCellsOf(value: unknown, grid: Grid): Record<string, Cell> {
  const cells: Record<string, Cell> = {}
  for (const [key, raw] of Object.entries(recordOf(value))) {
    const cell = cellOf(recordOf(raw), grid, ICON_SPAN)
    if (cell !== undefined) {
      cells[key] = cell
    }
  }
  return cells
}

// A desktop arranged before the grid stored pixel points; the nearest cell is
// where such an item goes.
export function cellOf(stored: Record<string, unknown>, grid: Grid, span = ICON_SPAN): Cell | undefined {
  const { x, y, column, row } = stored
  if (typeof column === 'number' && typeof row === 'number') {
    return { column, row }
  }
  if (typeof x === 'number' && typeof y === 'number') {
    return nearestCell(grid, { x, y }, span)
  }
  return undefined
}

// Config is the record of which widgets exist. A desktop that has never been
// arranged has no entry at all, and takes the view tree's seed instead — an
// empty object is an emptied desktop and stays empty.
export function instancesOf(stored: unknown, seed: WidgetSeed[], grid: Grid): WidgetInstance[] {
  if (typeof stored !== 'object' || stored === null) {
    return seed.map((entry) => seededInstance(entry))
  }
  const seededTypes = new Map(seed.map((entry) => [entry.id, entry.type]))
  return Object.entries(recordOf(stored)).flatMap(([id, raw]) => instanceOf(id, raw, grid, seededTypes))
}

function seededInstance(seed: WidgetSeed): WidgetInstance {
  return { id: seed.id, type: seed.type, size: seed.size, locked: false }
}

function instanceOf(
  id: string,
  raw: unknown,
  grid: Grid,
  seededTypes: ReadonlyMap<string, string>,
): WidgetInstance[] {
  const stored = recordOf(raw)
  const type = typeOf(stored, id, seededTypes)
  if (type === '') {
    return []
  }
  const size = stringOr(stored.size, 'small')
  return [{ id, type, size, cell: cellOf(stored, grid, spanOf(size)), locked: stored.locked === true }]
}

// A desktop arranged before config carried the type has entries holding only a
// placement. The seed still knows what each of its own ids is, so those entries
// keep working; one naming an id the seed never had is not a widget.
function typeOf(stored: Record<string, unknown>, id: string, seededTypes: ReadonlyMap<string, string>): string {
  if (typeof stored.type === 'string' && stored.type !== '') {
    return stored.type
  }
  const seeded = seededTypes.get(id)
  if (seeded === undefined) {
    return ''
  }
  return seeded
}

export function entriesOf(value: unknown): DesktopEntry[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(entryOf).filter((entry): entry is DesktopEntry => entry !== null)
}

function entryOf(raw: unknown): DesktopEntry | null {
  const record = recordOf(raw)
  const { name, path } = record
  if (typeof name !== 'string' || typeof path !== 'string') {
    return null
  }
  return {
    name,
    path,
    directory: record.directory === true,
    icon: stringOr(record.icon, 'text-x-generic'),
    image: record.image === true,
    thumbnail: stringOr(record.thumbnail, ''),
  }
}

export function seedsOf(value: unknown): WidgetSeed[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap(seedOf)
}

function seedOf(raw: unknown): WidgetSeed[] {
  const record = recordOf(raw)
  const { id, type } = record
  if (typeof id !== 'string' || id === '' || typeof type !== 'string' || type === '') {
    return []
  }
  return [{ id, type, size: stringOr(record.size, 'small') }]
}

// nextWidgetId names a widget added from the gallery after its type, so a
// config file stays readable: weather, then weather-2.
export function nextWidgetId(type: string, taken: ReadonlySet<string>): string {
  const base = type.split('.')[0]
  if (!taken.has(base)) {
    return base
  }
  for (let suffix = 2; ; suffix += 1) {
    const id = `${base}-${suffix}`
    if (!taken.has(id)) {
      return id
    }
  }
}

function stringOr(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value === '') {
    return fallback
  }
  return value
}
