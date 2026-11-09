// The desktop's one grid: icons take a cell, widgets a block of cells
// (small 2×2, medium 4×2, large 4×4). A drop always lands on the cell nearest
// to where it was let go, and whatever sits there moves to the nearest free
// cells instead — nothing is ever refused.
//
// The cell is a design measure that scales with the output: as many cells
// across as keep each under MAX_UNIT_PX, so a widget is proportional on any
// monitor. Everything here is pure.

export const GAP_PX = 16
// The margin down each side of the desktop.
export const MARGIN_PX = 16
// Clears the topbar's exclusive zone: the background layer spans the whole
// output, so anything at y=0 would render behind the bar.
export const TOP_PX = 48
// Keeps the bottom clear of the dock.
export const BOTTOM_MARGIN_PX = 88
export const MAX_UNIT_PX = 96

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Point, Size {}

export interface Viewport {
  width: number
  height: number
}

export interface Span {
  columns: number
  rows: number
}

export interface Cell {
  column: number
  row: number
}

export interface Grid {
  unit: number
  // A cell and the gap after it.
  pitch: number
  origin: Point
  columns: number
  rows: number
}

export const ICON_SPAN: Span = { columns: 1, rows: 1 }

const SPANS: Record<string, Span> = {
  small: { columns: 2, rows: 2 },
  medium: { columns: 4, rows: 2 },
  large: { columns: 4, rows: 4 },
}

const DEFAULT_SPAN: Span = SPANS.small

export const SIZE_NAMES = ['small', 'medium', 'large']

export function spanOf(size: unknown): Span {
  if (typeof size !== 'string') {
    return DEFAULT_SPAN
  }
  const span = SPANS[size]
  if (span === undefined) {
    return DEFAULT_SPAN
  }
  return span
}

// unitOf keeps a cell proportional to the output without letting it grow past
// the design size: the width is divided into as many cells as it takes to
// bring each one under the maximum.
export function unitOf(viewportWidth: number): number {
  const usable = viewportWidth - 2 * MARGIN_PX
  if (usable <= MAX_UNIT_PX) {
    return Math.max(1, usable)
  }
  const columns = Math.ceil((usable + GAP_PX) / (MAX_UNIT_PX + GAP_PX))
  return (usable - (columns - 1) * GAP_PX) / columns
}

export function gridOf(viewport: Viewport): Grid {
  const unit = unitOf(viewport.width)
  const pitch = unit + GAP_PX
  const usableWidth = viewport.width - 2 * MARGIN_PX
  const usableHeight = viewport.height - TOP_PX - BOTTOM_MARGIN_PX
  return {
    unit,
    pitch,
    origin: { x: MARGIN_PX, y: TOP_PX },
    columns: Math.max(1, Math.floor((usableWidth + GAP_PX) / pitch)),
    rows: Math.max(1, Math.floor((usableHeight + GAP_PX) / pitch)),
  }
}

// sizePx is the pixel box of a span, the gaps between its cells included.
export function sizePx(unit: number, span: Span): Size {
  return {
    width: span.columns * unit + (span.columns - 1) * GAP_PX,
    height: span.rows * unit + (span.rows - 1) * GAP_PX,
  }
}

export function pointOfCell(grid: Grid, cell: Cell): Point {
  return { x: grid.origin.x + cell.column * grid.pitch, y: grid.origin.y + cell.row * grid.pitch }
}

export function rectOf(point: Point, size: Size): Rect {
  return { x: point.x, y: point.y, width: size.width, height: size.height }
}

/** The cell whose origin is nearest to `point`, kept so the span fits on the grid. */
export function nearestCell(grid: Grid, point: Point, span: Span): Cell {
  return clampCell(
    grid,
    {
      column: Math.round((point.x - grid.origin.x) / grid.pitch),
      row: Math.round((point.y - grid.origin.y) / grid.pitch),
    },
    span,
  )
}

export function clampCell(grid: Grid, cell: Cell, span: Span): Cell {
  return {
    column: clamp(cell.column, 0, Math.max(0, grid.columns - span.columns)),
    row: clamp(cell.row, 0, Math.max(0, grid.rows - span.rows)),
  }
}

export function sameCell(left: Cell | undefined, right: Cell | undefined): boolean {
  if (left === undefined || right === undefined) {
    return left === right
  }
  return left.column === right.column && left.row === right.row
}

export interface GridItem {
  key: string
  span: Span
  // Where it was put; absent for one that has never been placed.
  cell?: Cell
  // Where an item with no cell goes looking for one: icons flow down from the
  // top-left, widgets gather from the top-right.
  flow: 'icons' | 'widgets'
}

/**
 * Every item's cell. Pinned items (the ones being dropped) take their cell
 * first; then each item keeps its own cell if it is still free, in order; what
 * was pushed off takes the nearest free cell to where it was; and items never
 * placed flow in last. A grid too full for an item leaves it overlapping.
 */
export function arrange(grid: Grid, items: GridItem[], pins: ReadonlyMap<string, Cell>): Map<string, Cell> {
  const board = new Board(grid)
  const cells = new Map<string, Cell>()
  const byKey = new Map(items.map((item) => [item.key, item]))
  for (const [key, pin] of pins) {
    const item = byKey.get(key)
    if (item !== undefined) {
      cells.set(key, board.claimNear(clampCell(grid, pin, item.span), item.span))
    }
  }
  const displaced: GridItem[] = []
  for (const item of items) {
    keepOwnCell(board, cells, displaced, item)
  }
  for (const item of displaced) {
    cells.set(item.key, board.claimNear(clampCell(grid, cellOrOrigin(item.cell), item.span), item.span))
  }
  for (const item of items.filter((candidate) => !cells.has(candidate.key))) {
    cells.set(item.key, board.claimFlowing(item))
  }
  return cells
}

const ORIGIN_CELL: Cell = { column: 0, row: 0 }

function cellOrOrigin(cell: Cell | undefined): Cell {
  if (cell === undefined) {
    return ORIGIN_CELL
  }
  return cell
}

function keepOwnCell(board: Board, cells: Map<string, Cell>, displaced: GridItem[], item: GridItem): void {
  if (cells.has(item.key) || item.cell === undefined) {
    return
  }
  const cell = clampCell(board.grid, item.cell, item.span)
  if (!board.fits(cell, item.span)) {
    displaced.push(item)
    return
  }
  board.claim(cell, item.span)
  cells.set(item.key, cell)
}

class Board {
  readonly grid: Grid
  private readonly taken: boolean[]

  constructor(grid: Grid) {
    this.grid = grid
    this.taken = Array.from({ length: grid.columns * grid.rows }, () => false)
  }

  fits(cell: Cell, span: Span): boolean {
    if (cell.column + span.columns > this.grid.columns || cell.row + span.rows > this.grid.rows) {
      return false
    }
    return this.covered(cell, span).every((index) => !this.taken[index])
  }

  claim(cell: Cell, span: Span): void {
    for (const index of this.covered(cell, span)) {
      this.taken[index] = true
    }
  }

  // The free cell nearest to `wanted`, or `wanted` itself when none is free.
  claimNear(wanted: Cell, span: Span): Cell {
    const found = this.origins(span)
      .sort((left, right) => distance(left, wanted) - distance(right, wanted))
      .find((cell) => this.fits(cell, span))
    return this.claimFound(found, wanted, span)
  }

  claimFlowing(item: GridItem): Cell {
    if (item.flow === 'widgets') {
      return this.claimNear({ column: this.grid.columns - item.span.columns, row: 0 }, item.span)
    }
    // origins() walks each column top to bottom, left to right: reading order
    // for a column of icons.
    const found = this.origins(item.span).find((cell) => this.fits(cell, item.span))
    return this.claimFound(found, ORIGIN_CELL, item.span)
  }

  private claimFound(found: Cell | undefined, fallback: Cell, span: Span): Cell {
    let cell = clampCell(this.grid, fallback, span)
    if (found !== undefined) {
      cell = found
    }
    this.claim(cell, span)
    return cell
  }

  private origins(span: Span): Cell[] {
    const cells: Cell[] = []
    for (let column = 0; column + span.columns <= this.grid.columns; column += 1) {
      for (let row = 0; row + span.rows <= this.grid.rows; row += 1) {
        cells.push({ column, row })
      }
    }
    return cells
  }

  private covered(cell: Cell, span: Span): number[] {
    const indices: number[] = []
    for (let column = cell.column; column < cell.column + span.columns; column += 1) {
      for (let row = cell.row; row < cell.row + span.rows; row += 1) {
        indices.push(row * this.grid.columns + column)
      }
    }
    return indices
  }
}

// Rows weigh a little more than columns, so a tie goes sideways: pushed items
// stay on the row they were on, the way a line of widgets reads.
function distance(left: Cell, right: Cell): number {
  const columns = left.column - right.column
  const rows = left.row - right.row
  return columns * columns + rows * rows * 1.01
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}
