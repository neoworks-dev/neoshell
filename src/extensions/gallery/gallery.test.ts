import { describe, expect, test } from 'bun:test'
import { initialAssignment, nextSwap, startOf } from './cycle.js'
import { boxesOf, planOf, swapOrder, thumbnailPixels } from './layout.js'
import { folderPathOf, isImageName, normalizeInterval, normalizeLayout, shuffled } from './library.js'
import { libraryOf, shortFolder } from './topic.js'

function coverage(plan: ReturnType<typeof planOf>): number[] {
  const cells = Array.from({ length: plan.columns * plan.rows }, () => 0)
  for (const tile of plan.tiles) {
    for (let row = tile.row; row < tile.row + tile.rows; row++) {
      for (let column = tile.column; column < tile.column + tile.columns; column++) {
        cells[row * plan.columns + column] += 1
      }
    }
  }
  return cells
}

describe('layout plans', () => {
  for (const size of ['small', 'medium', 'large']) {
    for (const layout of ['grid', 'mosaic']) {
      test(`${layout} ${size} covers every cell exactly once`, () => {
        const plan = planOf(size, layout, 20)
        expect(coverage(plan).every((count) => count === 1)).toBe(true)
      })
    }
  }

  test('one picture fills the widget, none leaves nothing', () => {
    expect(planOf('large', 'mosaic', 1).tiles).toHaveLength(1)
    expect(planOf('large', 'grid', 0).tiles).toHaveLength(0)
  })

  test('mosaic has a tile larger than the rest', () => {
    const tiles = planOf('medium', 'mosaic', 9).tiles
    const areas = tiles.map((tile) => tile.columns * tile.rows)
    expect(Math.max(...areas)).toBeGreaterThan(1)
  })

  test('the grid has the tile counts each size is designed for', () => {
    expect(planOf('small', 'grid', 9).tiles).toHaveLength(4)
    expect(planOf('medium', 'grid', 9).tiles).toHaveLength(8)
    expect(planOf('large', 'grid', 9).tiles).toHaveLength(9)
  })
})

describe('tile boxes', () => {
  test('tile boxes span the width with the gaps between them', () => {
    const plan = planOf('medium', 'grid', 9)
    const boxes = boxesOf(plan, 400, 200, 4)
    const lastInRow = boxes[3]
    expect(boxes[0].x).toBe(0)
    expect(lastInRow.x + lastInRow.width).toBe(400)
    expect(boxes[4].y).toBeGreaterThan(boxes[0].y + boxes[0].height - 1)
  })

  test('a spanning tile covers its cells and the gap between them', () => {
    const plan = planOf('small', 'mosaic', 9)
    const boxes = boxesOf(plan, 204, 204, 4)
    expect(boxes[0].height).toBe(204)
    expect(boxes[0].width).toBe(100)
  })

  test('thumbnails are bucketed by the larger side', () => {
    expect(thumbnailPixels({ x: 0, y: 0, width: 90, height: 90 })).toBe(160)
    expect(thumbnailPixels({ x: 0, y: 0, width: 200, height: 410 })).toBe(512)
    expect(thumbnailPixels({ x: 0, y: 0, width: 4000, height: 10 })).toBe(768)
  })
})

describe('swap order', () => {
  test('visits every tile once', () => {
    for (const count of [1, 2, 3, 4, 5, 8, 9]) {
      const order = swapOrder(count)
      expect([...order].sort((first, second) => first - second)).toEqual(
        Array.from({ length: count }, (_, index) => index),
      )
    }
  })

  test('does not sweep left to right', () => {
    expect(swapOrder(9)).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })
})

describe('cycling', () => {
  test('the first pictures fill the tiles and wrap when there are few', () => {
    expect(initialAssignment(4, 10, 0)).toEqual([0, 1, 2, 3])
    expect(initialAssignment(4, 2, 0)).toEqual([0, 1, 0, 1])
    expect(initialAssignment(4, 0, 0)).toEqual([])
  })

  test('the sequence starts at the given picture and wraps round the end', () => {
    expect(initialAssignment(4, 10, 8)).toEqual([8, 9, 0, 1])
  })

  test('a widget id picks a stable start inside the library', () => {
    const first = startOf('g-small', 50)
    expect(startOf('g-small', 50)).toBe(first)
    expect(first).toBeLessThan(50)
    expect(startOf('g-small', 50)).not.toBe(startOf('g-medium', 50))
    expect(startOf('anything', 0)).toBe(0)
  })

  test('the next swap brings in a picture no tile shows', () => {
    const assignment = [0, 1, 2, 3]
    const order = swapOrder(4)
    const result = nextSwap(assignment, order, 0, 4, 10)
    expect(result.swap).toEqual({ tile: order[0], image: 4 })
    expect(result.cursor).toBe(5)
  })

  test('the cursor skips pictures already on show and wraps', () => {
    const result = nextSwap([8, 9, 0, 1], [0, 1, 2, 3], 1, 8, 10)
    expect(result.swap).toEqual({ tile: 1, image: 2 })
    expect(result.cursor).toBe(3)
  })

  test('a swap that would change nothing is skipped', () => {
    const result = nextSwap([0], [0], 0, 0, 1)
    expect(result.swap).toBeNull()
  })

  test('no pictures, no swap', () => {
    expect(nextSwap([], [], 0, 0, 0).swap).toBeNull()
  })

  test('every picture comes round before one repeats', () => {
    let assignment = initialAssignment(4, 12, 0)
    const order = swapOrder(4)
    let cursor = 4
    const introduced: number[] = []
    for (let tick = 0; tick < 8; tick++) {
      const result = nextSwap(assignment, order, tick, cursor, 12)
      cursor = result.cursor
      if (result.swap === null) {
        continue
      }
      introduced.push(result.swap.image)
      assignment = assignment.map((image, tile) => {
        if (result.swap !== null && tile === result.swap.tile) {
          return result.swap.image
        }
        return image
      })
    }
    expect(introduced).toEqual([4, 5, 6, 7, 8, 9, 10, 11])
  })
})

describe('library helpers', () => {
  test('image names are recognised by extension, case-insensitively', () => {
    expect(isImageName('holiday.JPG')).toBe(true)
    expect(isImageName('notes.txt')).toBe(false)
    expect(isImageName('.png')).toBe(false)
    expect(isImageName('png')).toBe(false)
  })

  test('shuffle is a permutation and uses the random source', () => {
    const items = [1, 2, 3, 4, 5]
    const result = shuffled(items, () => 0)
    expect([...result].sort((first, second) => first - second)).toEqual(items)
    expect(result).not.toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5])
  })

  test('the interval is clamped and defaults', () => {
    expect(normalizeInterval(0)).toBe(2)
    expect(normalizeInterval(9999)).toBe(60)
    expect(normalizeInterval('x')).toBe(6)
    expect(normalizeInterval(10.4)).toBe(10)
  })

  test('layout falls back to grid', () => {
    expect(normalizeLayout('mosaic')).toBe('mosaic')
    expect(normalizeLayout('stack')).toBe('grid')
  })

  test('folders expand a leading ~ and fall back when empty', () => {
    expect(folderPathOf('~/Photos', '/home/me', '/x')).toBe('/home/me/Photos')
    expect(folderPathOf('~', '/home/me', '/x')).toBe('/home/me')
    expect(folderPathOf('  ', '/home/me', '/x')).toBe('/x')
    expect(folderPathOf('/data/pics', '/home/me', '/x')).toBe('/data/pics')
  })

  test('the topic is read defensively', () => {
    const library = libraryOf({
      folder: '~/Pictures',
      status: 'ok',
      images: [{ file: 'file:1', name: 'a.png' }, { file: '' }, 7],
      intervalSeconds: 1,
      layout: 'mosaic',
    })
    expect(library.images).toEqual([{ file: 'file:1', name: 'a.png' }])
    expect(library.intervalSeconds).toBe(2)
    expect(library.layout).toBe('mosaic')
    expect(libraryOf(null).images).toEqual([])
  })

  test('home is shortened to a tilde', () => {
    expect(shortFolder('/home/me/Pictures', '/home/me')).toBe('~/Pictures')
    expect(shortFolder('/home/me', '/home/me')).toBe('~')
    expect(shortFolder('/data', '/home/me')).toBe('/data')
  })
})
