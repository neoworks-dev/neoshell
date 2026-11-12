import { arrayOf, numberOf, stringListOf, stringOf } from '../../lib/record.js'
import type { Transfer } from './state.js'

// What Quick Share has finished sending and receiving, newest first, kept
// across restarts so Settings can show recent shares and the devices behind
// them. Only finished transfers count: a declined or broken one left nothing
// to show.
//
// A device is paired when its name is in quickshare.trusted; what is known
// about it beyond the name comes from its shares here.

export const HISTORY_LIMIT = 40

export interface HistoryEntry {
  id: string
  direction: string
  peer: string
  peerType: string
  files: string[]
  savedPaths: string[]
  text: string
  textKind: string
  bytesTotal: number
  // Milliseconds since the epoch.
  endedAt: number
}

export interface PairedDevice {
  name: string
  // From its latest share; '' when it has not shared yet.
  deviceType: string
  shares: number
  lastShareAt: number
}

export function historyEntryOf(transfer: Transfer, endedAt: number): HistoryEntry {
  return {
    id: transfer.id,
    direction: transfer.direction,
    peer: transfer.peer,
    peerType: transfer.peerType,
    files: transfer.files,
    savedPaths: transfer.savedPaths,
    text: transfer.text,
    textKind: transfer.textKind,
    bytesTotal: transfer.bytesTotal,
    endedAt,
  }
}

/** The history with `entry` first; an entry with the same id is replaced, and the oldest past the limit dropped. */
export function withHistoryEntry(entries: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const others = entries.filter((known) => known.id !== entry.id)
  return [entry, ...others].slice(0, HISTORY_LIMIT)
}

/** The history as the state file holds it; anything unreadable is left out. */
export function historyOf(value: unknown): HistoryEntry[] {
  return arrayOf(value)
    .map((record) => ({
      id: stringOf(record.id),
      direction: stringOf(record.direction),
      peer: stringOf(record.peer),
      peerType: stringOf(record.peerType),
      files: stringListOf(record.files),
      savedPaths: stringListOf(record.savedPaths),
      text: stringOf(record.text),
      textKind: stringOf(record.textKind),
      bytesTotal: numberOf(record.bytesTotal, 0),
      endedAt: numberOf(record.endedAt, 0),
    }))
    .filter((entry) => entry.id !== '' && entry.peer !== '')
    .slice(0, HISTORY_LIMIT)
}

/** Whether `path` is a file a finished share left on this computer. */
export function isSavedPath(entries: HistoryEntry[], path: string): boolean {
  return path !== '' && entries.some((entry) => entry.savedPaths.includes(path))
}

/** Each trusted name, with what its shares tell about it, in the order they were paired. */
export function pairedDevicesOf(trusted: string[], entries: HistoryEntry[]): PairedDevice[] {
  return trusted.map((name) => pairedDeviceOf(name, entries))
}

function pairedDeviceOf(name: string, entries: HistoryEntry[]): PairedDevice {
  const shares = entries.filter((entry) => entry.peer === name)
  const latest = shares[0]
  if (latest === undefined) {
    return { name, deviceType: '', shares: 0, lastShareAt: 0 }
  }
  return { name, deviceType: latest.peerType, shares: shares.length, lastShareAt: latest.endedAt }
}
