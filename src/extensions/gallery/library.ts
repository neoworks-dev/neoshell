// Which files the gallery lists and in what order. Pure; the backend does the
// directory walking.

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'avif', 'heic'])

export interface ImageFile {
  path: string
  name: string
  modified: number
}

export const MAX_IMAGES = 600

export function isImageName(name: string): boolean {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) {
    return false
  }
  return IMAGE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase())
}

/** Newest first, the order a gallery of recent pictures wants. */
export function newestFirst(images: ImageFile[]): ImageFile[] {
  return [...images].sort((first, second) => second.modified - first.modified)
}

/** Fisher-Yates, with the random source passed in so a test can fix it. */
export function shuffled<Item>(items: Item[], random: () => number): Item[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    const held = result[index]
    result[index] = result[other]
    result[other] = held
  }
  return result
}

export function normalizeLayout(value: unknown): string {
  if (value === 'mosaic') {
    return 'mosaic'
  }
  return 'grid'
}

export const DEFAULT_INTERVAL_SECONDS = 6
export const MIN_INTERVAL_SECONDS = 2
export const MAX_INTERVAL_SECONDS = 60

export function normalizeInterval(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_INTERVAL_SECONDS
  }
  return Math.min(MAX_INTERVAL_SECONDS, Math.max(MIN_INTERVAL_SECONDS, Math.round(value)))
}

/** `~` and a bare `~/` prefix expanded against the home directory; empty means the default folder. */
export function folderPathOf(configured: unknown, home: string, fallback: string): string {
  if (typeof configured !== 'string' || configured.trim() === '') {
    return fallback
  }
  const trimmed = configured.trim()
  if (trimmed === '~') {
    return home
  }
  if (trimmed.startsWith('~/')) {
    return `${home}/${trimmed.slice(2)}`
  }
  return trimmed
}
