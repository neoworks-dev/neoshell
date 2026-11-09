// Which picture each tile shows, and which one changes next.

export interface Swap {
  tile: number
  image: number
}

export interface SwapResult {
  swap: Swap | null
  cursor: number
}

/**
 * The pictures the sequence starts on, one per tile from `start`, wrapping
 * when there are fewer pictures than tiles.
 */
export function initialAssignment(tileCount: number, imageCount: number, start: number): number[] {
  if (imageCount <= 0) {
    return []
  }
  return Array.from({ length: tileCount }, (_, tile) => (start + tile) % imageCount)
}

/** Where a widget's sequence starts, from its id, so two galleries do not show the same pictures. */
export function startOf(widgetId: string, imageCount: number): number {
  if (imageCount <= 0) {
    return 0
  }
  let hash = 0
  for (const character of widgetId) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1_000_003
  }
  return hash % imageCount
}

/**
 * The swap for tick number `tick`: the tile the order names gets the next
 * picture at `cursor` that no tile is showing. With fewer pictures than tiles
 * every picture is on show already, so the next one is taken regardless and a
 * swap that would change nothing is skipped.
 */
export function nextSwap(
  assignment: number[],
  order: number[],
  tick: number,
  cursor: number,
  imageCount: number,
): SwapResult {
  if (assignment.length === 0 || imageCount <= 0 || order.length === 0) {
    return { swap: null, cursor }
  }
  const tile = order[tick % order.length]
  const image = unshownImage(assignment, cursor, imageCount)
  const nextCursor = (image + 1) % imageCount
  if (assignment[tile] === image) {
    return { swap: null, cursor: nextCursor }
  }
  return { swap: { tile, image }, cursor: nextCursor }
}

function unshownImage(assignment: number[], cursor: number, imageCount: number): number {
  for (let offset = 0; offset < imageCount; offset++) {
    const candidate = (cursor + offset) % imageCount
    if (!assignment.includes(candidate)) {
      return candidate
    }
  }
  return cursor % imageCount
}
