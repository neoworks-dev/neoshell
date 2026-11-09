import GLib from 'gi://GLib'
import { recordOf, stringListOf, stringOf } from '../lib/record.js'
import { downloadDropped } from '../extensions/neoshell/trayDownloads.js'

// What a client learns of a file drop. The paths and URIs stay here; the
// client's `ondrop` sees {drop, x, y}, and a backend that takes dropped
// files — the Tray, Quick Share — is handed the token back and asks for the
// files behind it. A client can act on a drop the user made, but cannot make
// one up.

const DROP_LIFETIME_MS = 5 * 60 * 1000

interface Drop {
  paths: string[]
  uris: string[]
  image: string
  files: Promise<string[]> | null
}

const drops = new Map<string, Drop>()

/** The event detail a client sees: a drop's own detail becomes a token. */
export function clientEventDetail(type: string, detail: unknown): unknown {
  if (type !== 'drop') {
    return detail
  }
  const record = recordOf(detail)
  return { drop: registerDrop(record), x: record.x, y: record.y }
}

function registerDrop(record: Record<string, unknown>): string {
  const token = `drop:${GLib.uuid_string_random()}`
  drops.set(token, {
    paths: stringListOf(record.paths),
    uris: stringListOf(record.uris),
    image: stringOf(record.image),
    files: null,
  })
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, DROP_LIFETIME_MS, () => {
    drops.delete(token)
    return GLib.SOURCE_REMOVE
  })
  return token
}

/**
 * The files a drop brought: its local paths, then whatever its URIs
 * downloaded to. Fetched once, however often it is asked; [] for a token the
 * host never gave out or has forgotten.
 */
export function filesOfDrop(token: unknown): Promise<string[]> {
  const drop = drops.get(stringOf(token))
  if (drop === undefined) {
    return Promise.resolve([])
  }
  if (drop.files === null) {
    drop.files = downloadDropped(drop.uris, drop.image).then((downloaded) => [...drop.paths, ...downloaded])
  }
  return drop.files
}
