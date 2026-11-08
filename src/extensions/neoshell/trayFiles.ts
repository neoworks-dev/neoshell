import Gio from 'gi://Gio'
import GLib from 'gi://GLib'

// The Tray keeps references to files, not copies: a dropped file stays where
// it was, and the Tray holds its path (config notch.staged) until it is
// removed. A tile is what the shelf needs to draw one.

export const STAGED_KEY = 'notch.staged'

export interface TrayTile {
  path: string
  name: string
  // A theme icon name.
  icon: string
  // A local image to show instead of the icon, or ''.
  thumbnail: string
  // The file was moved or deleted since it was dropped.
  missing: boolean
}

const FALLBACK_ICON = 'text-x-generic'

export function tileOf(path: string): TrayTile {
  const name = GLib.path_get_basename(path)
  if (!GLib.file_test(path, GLib.FileTest.EXISTS)) {
    return { path, name, icon: 'dialog-question-symbolic', thumbnail: '', missing: true }
  }
  if (GLib.file_test(path, GLib.FileTest.IS_DIR)) {
    return { path, name, icon: 'folder', thumbnail: '', missing: false }
  }
  const contentType = contentTypeOf(path)
  return {
    path,
    name,
    icon: iconNameOf(contentType),
    thumbnail: thumbnailOf(path, contentType),
    missing: false,
  }
}

// New paths go to the end; one already in the Tray is not added twice.
export function withPaths(staged: string[], added: string[]): string[] {
  const next = [...staged]
  for (const path of added) {
    if (!next.includes(path)) {
      next.push(path)
    }
  }
  return next
}

export function withoutPath(staged: string[], removed: string): string[] {
  return staged.filter((path) => path !== removed)
}

function contentTypeOf(path: string): string {
  const [guessed] = Gio.content_type_guess(path, null)
  if (guessed === null) {
    return 'application/octet-stream'
  }
  return guessed
}

function iconNameOf(contentType: string): string {
  const icon = Gio.content_type_get_icon(contentType)
  if (!(icon instanceof Gio.ThemedIcon)) {
    return FALLBACK_ICON
  }
  const names = icon.get_names()
  if (names.length === 0) {
    return FALLBACK_ICON
  }
  return names[0]
}

// GTK draws a CSS background image straight from disk, so a local image is
// its own thumbnail. Formats GdkPixbuf cannot read fall back to the icon.
function thumbnailOf(path: string, contentType: string): string {
  if (!contentType.startsWith('image/') || contentType === 'image/svg+xml') {
    return ''
  }
  return path
}
