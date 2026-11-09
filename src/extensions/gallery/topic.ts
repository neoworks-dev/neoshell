import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record.js'
import { DEFAULT_INTERVAL_SECONDS, normalizeInterval, normalizeLayout } from './library.js'

// What the widget reads out of a gallery.library message.

export interface LibraryImage {
  file: string
  name: string
}

export interface Library {
  folder: string
  status: string
  images: LibraryImage[]
  intervalSeconds: number
  shuffle: boolean
  layout: string
  version: number
}

export function libraryOf(data: unknown): Library {
  const record = recordOf(data)
  return {
    folder: stringOf(record.folder),
    status: stringOf(record.status),
    images: arrayOf(record.images).flatMap(imageOf),
    intervalSeconds: normalizeInterval(numberOf(record.intervalSeconds, DEFAULT_INTERVAL_SECONDS)),
    shuffle: record.shuffle === true,
    layout: normalizeLayout(record.layout),
    version: numberOf(record.version, 0),
  }
}

function imageOf(record: Record<string, unknown>): LibraryImage[] {
  const file = stringOf(record.file)
  if (file === '') {
    return []
  }
  return [{ file, name: stringOf(record.name) }]
}

/** A folder path as the widget prints it: the home directory shortened to ~. */
export function shortFolder(folder: string, home: string): string {
  if (home !== '' && folder === home) {
    return '~'
  }
  if (home !== '' && folder.startsWith(`${home}/`)) {
    return `~${folder.slice(home.length)}`
  }
  return folder
}
