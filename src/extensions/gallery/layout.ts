// The picture gallery's geometry: which tiles a widget size holds in each
// layout, where they sit in pixels, and how big a thumbnail each one needs.
// Pure, so the arrangement is testable without a window.

export interface TileRect {
  column: number
  row: number
  columns: number
  rows: number
}

export interface TilePlan {
  columns: number
  rows: number
  tiles: TileRect[]
}

export interface TileBox {
  x: number
  y: number
  width: number
  height: number
}

export const LAYOUT_GRID = 'grid'
export const LAYOUT_MOSAIC = 'mosaic'

const THUMBNAIL_BUCKETS = [160, 256, 384, 512, 768]

// Larger tiles first: the mosaic reads as one hero picture with smaller ones
// around it, each pattern filling its columns x rows exactly.
const MOSAIC_PLANS: Record<string, TilePlan> = {
  small: {
    columns: 2,
    rows: 2,
    tiles: [
      { column: 0, row: 0, columns: 1, rows: 2 },
      { column: 1, row: 0, columns: 1, rows: 1 },
      { column: 1, row: 1, columns: 1, rows: 1 },
    ],
  },
  medium: {
    columns: 4,
    rows: 2,
    tiles: [
      { column: 0, row: 0, columns: 2, rows: 2 },
      { column: 2, row: 0, columns: 2, rows: 1 },
      { column: 2, row: 1, columns: 1, rows: 1 },
      { column: 3, row: 1, columns: 1, rows: 1 },
    ],
  },
  large: {
    columns: 4,
    rows: 4,
    tiles: [
      { column: 0, row: 0, columns: 2, rows: 2 },
      { column: 2, row: 0, columns: 2, rows: 1 },
      { column: 2, row: 1, columns: 1, rows: 1 },
      { column: 3, row: 1, columns: 1, rows: 2 },
      { column: 0, row: 2, columns: 1, rows: 2 },
      { column: 1, row: 2, columns: 2, rows: 1 },
      { column: 1, row: 3, columns: 2, rows: 1 },
      { column: 3, row: 3, columns: 1, rows: 1 },
    ],
  },
}

const GRID_DIMENSIONS: Record<string, { columns: number; rows: number }> = {
  small: { columns: 2, rows: 2 },
  medium: { columns: 4, rows: 2 },
  large: { columns: 3, rows: 3 },
}

export function planOf(size: string, layout: string, imageCount: number): TilePlan {
  if (imageCount <= 0) {
    return { columns: 1, rows: 1, tiles: [] }
  }
  if (imageCount === 1) {
    return { columns: 1, rows: 1, tiles: [{ column: 0, row: 0, columns: 1, rows: 1 }] }
  }
  if (layout === LAYOUT_MOSAIC) {
    return mosaicPlanOf(size)
  }
  return gridPlanOf(size)
}

function mosaicPlanOf(size: string): TilePlan {
  const plan = MOSAIC_PLANS[size]
  if (plan === undefined) {
    return MOSAIC_PLANS.small
  }
  return plan
}

function gridPlanOf(size: string): TilePlan {
  let dimensions = GRID_DIMENSIONS[size]
  if (dimensions === undefined) {
    dimensions = GRID_DIMENSIONS.small
  }
  const tiles: TileRect[] = []
  for (let row = 0; row < dimensions.rows; row++) {
    for (let column = 0; column < dimensions.columns; column++) {
      tiles.push({ column, row, columns: 1, rows: 1 })
    }
  }
  return { columns: dimensions.columns, rows: dimensions.rows, tiles }
}

/** Pixel boxes for a plan inside width x height, `gap` pixels apart. */
export function boxesOf(plan: TilePlan, width: number, height: number, gap: number): TileBox[] {
  const unitWidth = (width - gap * (plan.columns - 1)) / plan.columns
  const unitHeight = (height - gap * (plan.rows - 1)) / plan.rows
  return plan.tiles.map((tile) => ({
    x: Math.round(tile.column * (unitWidth + gap)),
    y: Math.round(tile.row * (unitHeight + gap)),
    width: Math.round(tile.columns * unitWidth + (tile.columns - 1) * gap),
    height: Math.round(tile.rows * unitHeight + (tile.rows - 1) * gap),
  }))
}

/** The decode size for a tile: bucketed, so tiles of one size share a cached thumbnail. */
export function thumbnailPixels(box: TileBox): number {
  const needed = Math.max(box.width, box.height)
  for (const bucket of THUMBNAIL_BUCKETS) {
    if (bucket >= needed) {
      return bucket
    }
  }
  return THUMBNAIL_BUCKETS[THUMBNAIL_BUCKETS.length - 1]
}

/** The order tiles are swapped in: a permutation that jumps around rather than sweeping. */
export function swapOrder(count: number): number[] {
  if (count <= 2) {
    return Array.from({ length: count }, (_, index) => index)
  }
  let stride = Math.floor(count / 2)
  while (greatestCommonDivisor(stride, count) !== 1) {
    stride += 1
  }
  return Array.from({ length: count }, (_, index) => (index * stride) % count)
}

function greatestCommonDivisor(first: number, second: number): number {
  let larger = first
  let smaller = second
  while (smaller !== 0) {
    const remainder = larger % smaller
    larger = smaller
    smaller = remainder
  }
  return larger
}
