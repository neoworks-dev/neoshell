import GLib from 'gi://GLib'
import { thumbnailTexture } from '../extensions/neoshell/trayFiles.js'

// Pictures a client may show. A host backend registers a paintable and
// publishes the handle on the bus; a client puts it on <gtkpicture handle>,
// and the client policy swaps it back for the paintable. A handle is a random
// token, so a client can only show what it was handed, never guess at what
// else is there.

const paintables = new Map<string, unknown>()

export function registerPaintable(paintable: unknown): string {
  const handle = `paintable:${GLib.uuid_string_random()}`
  paintables.set(handle, paintable)
  return handle
}

export function releasePaintable(handle: string): void {
  paintables.delete(handle)
}

export function paintableOf(handle: string): unknown {
  const paintable = paintables.get(handle)
  if (paintable === undefined) {
    return null
  }
  return paintable
}

// Thumbnails asked for again and again — the same album art for every view
// showing the track — share one decode and one handle.
const thumbnails = new Map<string, string>()
const MAX_THUMBNAILS = 64

/** A handle for the image at `path`, decoded so its shorter side is `pixels`; '' if it cannot be read. */
export function thumbnailHandle(path: string, pixels: number): string {
  const key = `${pixels}:${path}`
  const known = thumbnails.get(key)
  if (known !== undefined) {
    return known
  }
  const texture = thumbnailTexture(path, pixels)
  if (texture === null) {
    return ''
  }
  const handle = registerPaintable(texture)
  rememberThumbnail(key, handle)
  return handle
}

function rememberThumbnail(key: string, handle: string): void {
  thumbnails.set(key, handle)
  if (thumbnails.size <= MAX_THUMBNAILS) {
    return
  }
  const [oldestKey, oldestHandle] = thumbnails.entries().next().value as [string, string]
  thumbnails.delete(oldestKey)
  releasePaintable(oldestHandle)
}
