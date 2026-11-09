import { arrayOf, recordOf, stringOf } from '../../lib/record.js'

// The Tray as its views see it: tray.files from the tray backend, where a
// file is a handle and a thumbnail a picture handle.

export interface ShelfTile {
  // A file handle: what drag-files, tray:open and tray:remove take.
  file: string
  path: string
  name: string
  // A theme icon name.
  icon: string
  // A picture handle, or '' to show the icon.
  thumbnail: string
  // The file was moved or deleted since it was dropped.
  missing: boolean
}

export function shelfTilesOf(data: unknown): ShelfTile[] {
  return arrayOf(recordOf(data).files).map((record) => ({
    file: stringOf(record.file),
    path: stringOf(record.path),
    name: stringOf(record.name),
    icon: stringOf(record.icon),
    thumbnail: stringOf(record.thumbnail),
    missing: record.missing === true,
  }))
}
