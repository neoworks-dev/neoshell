import { describe, expect, test } from 'bun:test'
import { GAP_PX, MARGIN_PX, arrange, gridOf, nearestCell } from './grid'
import type { Cell, GridItem, Span, Viewport } from './grid'
import { resolveLayout } from './desktopLayout'

const VIEWPORT = { width: 1920, height: 1080 }
const WIDGET: Span = { columns: 2, rows: 2 }
const ICON: Span = { columns: 1, rows: 1 }
const AT_ORIGIN = new Map([['widget', { column: 0, row: 0 }]])
const ENTRY = { name: 'a', path: '/d/a', directory: false, icon: '', image: false, thumbnail: '' }

function items(): GridItem[] {
  return [
    { key: 'widget', span: WIDGET, cell: { column: 10, row: 0 }, flow: 'widgets' },
    { key: 'a', span: ICON, cell: { column: 0, row: 0 }, flow: 'icons' },
    { key: 'b', span: ICON, cell: { column: 1, row: 0 }, flow: 'icons' },
    { key: 'c', span: ICON, cell: { column: 0, row: 1 }, flow: 'icons' },
  ]
}

function coveredCells(cell: Cell, span: Span): string[] {
  const covered: string[] = []
  for (let column = cell.column; column < cell.column + span.columns; column += 1) {
    for (let row = cell.row; row < cell.row + span.rows; row += 1) {
      covered.push(`${column},${row}`)
    }
  }
  return covered
}

describe('gridOf', () => {
  const outputs: Viewport[] = [VIEWPORT, { width: 3440, height: 1440 }, { width: 1920, height: 1200 }]

  for (const viewport of outputs) {
    test(`leaves at most half a row empty below the grid on ${viewport.width}×${viewport.height}`, () => {
      const grid = gridOf(viewport)
      const gridBottom = grid.origin.y + grid.rows * grid.pitch - GAP_PX
      expect(viewport.height - gridBottom).toBeLessThanOrEqual(MARGIN_PX + grid.pitch / 2)
    })
  }

  test('fits three rows of large widgets on a 3440×1440 output', () => {
    expect(gridOf({ width: 3440, height: 1440 }).rows).toBeGreaterThanOrEqual(12)
  })
})

describe('arrange', () => {
  const grid = gridOf(VIEWPORT)

  test('lands a drop on taken cells instead of refusing it', () => {
    expect(arrange(grid, items(), AT_ORIGIN).get('widget')).toEqual({ column: 0, row: 0 })
  })

  test('moves what a drop covered to the nearest free cells', () => {
    const cells = arrange(grid, items(), AT_ORIGIN)
    for (const key of ['a', 'b', 'c']) {
      const cell = cells.get(key)
      expect(cell).not.toBeUndefined()
      expect(Math.max(cell!.column, cell!.row)).toBeLessThanOrEqual(3)
    }
  })

  test('leaves no two items overlapping', () => {
    const all = items()
    const cells = arrange(grid, all, AT_ORIGIN)
    const covered = all.flatMap((item) => coveredCells(cells.get(item.key)!, item.span))
    expect(new Set(covered).size).toBe(covered.length)
  })

  test('flows new icons down from the top-left and a new widget from the top-right', () => {
    const fresh: GridItem[] = [
      { key: 'first', span: ICON, flow: 'icons' },
      { key: 'second', span: ICON, flow: 'icons' },
      { key: 'widget', span: WIDGET, flow: 'widgets' },
    ]
    const cells = arrange(grid, fresh, new Map())
    expect(cells.get('first')).toEqual({ column: 0, row: 0 })
    expect(cells.get('second')).toEqual({ column: 0, row: 1 })
    expect(cells.get('widget')).toEqual({ column: grid.columns - 2, row: 0 })
  })
})

describe('nearestCell', () => {
  test('brings a pixel point from before the grid back on its nearest cell', () => {
    const grid = gridOf(VIEWPORT)
    const near = { x: grid.origin.x + grid.pitch * 3 + 10, y: grid.origin.y + grid.pitch * 2 - 10 }
    expect(nearestCell(grid, near, ICON)).toEqual({ column: 3, row: 2 })
  })
})

describe('resolveLayout', () => {
  // The host carries the dragged widget, so it stays drawn on its committed
  // cell; the icon it covers is drawn where the drop will put it.
  test('keeps a dragged item put until its drop', () => {
    const layout = resolveLayout({
      entries: [ENTRY],
      storedIcons: { '/d/a': { column: 0, row: 0 } },
      instances: [{ id: 'w', type: 'weather.card', size: 'small', cell: { column: 10, row: 0 }, locked: false }],
      viewport: VIEWPORT,
      pins: new Map([['widget:w', { column: 0, row: 0 }]]),
    })
    const widget = layout.widgets.get('w')!
    expect(widget.cell).toEqual({ column: 10, row: 0 })
    expect(layout.icons.get('/d/a')!.x).toBeGreaterThan(widget.box.width)
    expect(layout.landings).toHaveLength(1)
  })

  test('pushes aside what a widget dragged in from the gallery covers', () => {
    const layout = resolveLayout({
      entries: [ENTRY],
      storedIcons: { '/d/a': { column: 0, row: 0 } },
      instances: [],
      viewport: VIEWPORT,
      pins: new Map(),
      incoming: { size: 'small', cell: { column: 0, row: 0 } },
    })
    expect(layout.icons.get('/d/a')!.x).toBeGreaterThan(layout.grid.origin.x)
    expect(layout.landings).toHaveLength(1)
  })
})
