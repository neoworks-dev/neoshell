import { GAP_PX, MARGIN_PX, arrange, gridOf, nearestCell, sameCell } from './extensions/neoshell/grid'
import type { Cell, Grid, GridItem, Viewport } from './extensions/neoshell/grid'
import { resolveLayout } from './extensions/neoshell/desktopLayout'
import { logicalMonitorSizeOf, namesMonitor } from './lib/placement'

// The desktop grid's rules, checked on plain values: a drop always lands where
// it was let go, what it covers moves to the nearest free cells, nothing ends
// up overlapping, and a desktop stored as pixels comes back on the grid.

const VIEWPORT = { width: 1920, height: 1080 }

export function gridFailure(): string | null {
  const grid = gridOf(VIEWPORT)
  const checks: [string, boolean][] = [
    ['a drop on taken cells is refused instead of landing', dropLands(grid)],
    ['what a drop covered did not move to the nearest free cells', coveredMovesNear(grid)],
    ['an arrangement left two items overlapping', noOverlap(grid)],
    ['new icons did not flow down from the top-left, or a new widget from the top-right', flows(grid)],
    ['a pixel point from before the grid did not come back on its nearest cell', pixelPointsMigrate(grid)],
    ['a dragged item moved on screen before its drop', draggedStaysPut()],
    ['a widget dragged in from the gallery did not push what was under it aside', incomingPushes()],
    ['the grid left more than half a row empty below its last row', reachesBottom()],
    ['a scaled monitor was not measured in logical pixels', scaledMonitorIsLogical()],
    ['a desktop not yet on a monitor took another monitor\'s size as its own', unplacedIsGuess()],
  ]
  const failed = checks.find(([, passed]) => !passed)
  if (failed === undefined) {
    return null
  }
  return `the desktop grid: ${failed[0]}`
}

const WIDGET = { columns: 2, rows: 2 }
const ICON = { columns: 1, rows: 1 }

function items(): GridItem[] {
  return [
    { key: 'widget', span: WIDGET, cell: { column: 10, row: 0 }, flow: 'widgets' },
    { key: 'a', span: ICON, cell: { column: 0, row: 0 }, flow: 'icons' },
    { key: 'b', span: ICON, cell: { column: 1, row: 0 }, flow: 'icons' },
    { key: 'c', span: ICON, cell: { column: 0, row: 1 }, flow: 'icons' },
  ]
}

function dropLands(grid: Grid): boolean {
  const cells = arrange(grid, items(), new Map([['widget', { column: 0, row: 0 }]]))
  return sameCell(cells.get('widget'), { column: 0, row: 0 })
}

// The widget covers a, b and c; each takes the free cell nearest to its own.
function coveredMovesNear(grid: Grid): boolean {
  const cells = arrange(grid, items(), new Map([['widget', { column: 0, row: 0 }]]))
  const moved = ['a', 'b', 'c'].map((key) => cells.get(key))
  return moved.every((cell) => cell !== undefined && distanceFromOrigin(cell) <= 3)
}

function distanceFromOrigin(cell: Cell): number {
  return Math.max(cell.column, cell.row)
}

function noOverlap(grid: Grid): boolean {
  const all = items()
  const cells = arrange(grid, all, new Map([['widget', { column: 0, row: 0 }]]))
  const covered = new Set<string>()
  for (const item of all) {
    const cell = cells.get(item.key)
    if (cell === undefined || !claimAll(covered, cell, item.span)) {
      return false
    }
  }
  return true
}

function claimAll(covered: Set<string>, cell: Cell, span: { columns: number; rows: number }): boolean {
  for (let column = cell.column; column < cell.column + span.columns; column += 1) {
    for (let row = cell.row; row < cell.row + span.rows; row += 1) {
      const key = `${column},${row}`
      if (covered.has(key)) {
        return false
      }
      covered.add(key)
    }
  }
  return true
}

function flows(grid: Grid): boolean {
  const fresh: GridItem[] = [
    { key: 'first', span: ICON, flow: 'icons' },
    { key: 'second', span: ICON, flow: 'icons' },
    { key: 'widget', span: WIDGET, flow: 'widgets' },
  ]
  const cells = arrange(grid, fresh, new Map())
  return (
    sameCell(cells.get('first'), { column: 0, row: 0 }) &&
    sameCell(cells.get('second'), { column: 0, row: 1 }) &&
    sameCell(cells.get('widget'), { column: grid.columns - 2, row: 0 })
  )
}

function pixelPointsMigrate(grid: Grid): boolean {
  const near = { x: grid.origin.x + grid.pitch * 3 + 10, y: grid.origin.y + grid.pitch * 2 - 10 }
  return sameCell(nearestCell(grid, near, ICON), { column: 3, row: 2 })
}

const OUTPUTS: Viewport[] = [VIEWPORT, { width: 3440, height: 1440 }, { width: 1920, height: 1200 }]

function reachesBottom(): boolean {
  return OUTPUTS.every((viewport) => {
    const grid = gridOf(viewport)
    const gridBottom = grid.origin.y + grid.rows * grid.pitch - GAP_PX
    return viewport.height - gridBottom <= MARGIN_PX + grid.pitch / 2
  })
}

const MONITORS = [
  { name: 'HDMI-A-1', width: 2560, height: 1600, scale: 1.3333334, transform: 0 },
  { name: 'DP-2', width: 3440, height: 1440, scale: 1, transform: 1 },
]

function scaledMonitorIsLogical(): boolean {
  const scaled = logicalMonitorSizeOf(MONITORS, 'HDMI-A-1')
  const turned = logicalMonitorSizeOf(MONITORS, 'DP-2')
  if (scaled === null || turned === null) {
    return false
  }
  return scaled.width === 1920 && scaled.height === 1200 && turned.width === 1440 && turned.height === 3440
}

function unplacedIsGuess(): boolean {
  return !namesMonitor(MONITORS, '') && namesMonitor([MONITORS[0]], '') && namesMonitor(MONITORS, 'DP-2')
}

function incomingPushes(): boolean {
  const entry = { name: 'a', path: '/d/a', directory: false, icon: '', image: false, thumbnail: '' }
  const layout = resolveLayout({
    entries: [entry],
    storedIcons: { '/d/a': { column: 0, row: 0 } },
    instances: [],
    viewport: VIEWPORT,
    pins: new Map(),
    incoming: { size: 'small', cell: { column: 0, row: 0 } },
  })
  const icon = layout.icons.get('/d/a')
  return icon !== undefined && icon.x > layout.grid.origin.x && layout.landings.length === 1
}

// While pinned, the dragged widget is still drawn on its committed cell (the
// host carries it); the icon it covers is drawn where the drop will put it.
function draggedStaysPut(): boolean {
  const entry = { name: 'a', path: '/d/a', directory: false, icon: '', image: false, thumbnail: '' }
  const layout = resolveLayout({
    entries: [entry],
    storedIcons: { '/d/a': { column: 0, row: 0 } },
    instances: [{ id: 'w', type: 'weather.card', size: 'small', cell: { column: 10, row: 0 }, locked: false }],
    viewport: VIEWPORT,
    pins: new Map([['widget:w', { column: 0, row: 0 }]]),
  })
  const widget = layout.widgets.get('w')
  const icon = layout.icons.get('/d/a')
  if (widget === undefined || icon === undefined) {
    return false
  }
  return sameCell(widget.cell, { column: 10, row: 0 }) && icon.x > widget.box.width && layout.landings.length === 1
}
