import { recordOf, stringListOf, stringOf, numberOf } from '../../lib/record.js'

// What the shell shows of Quick Share, folded from the helper's events
// (helpers/quickshare speaks JSON lines; see its protocol.rs).
//
// The helper reports one phone twice when it is found over both Wi-Fi (id
// "ip:port") and Bluetooth (id "ble://name"), so devices are grouped by name;
// sending prefers the Wi-Fi endpoint, which is the one a transfer runs over.

export interface Device {
  // The endpoint id a send goes to.
  id: string
  name: string
  deviceType: string
}

export interface Transfer {
  id: string
  direction: string
  state: string
  peer: string
  pin: string
  files: string[]
  text: string
  textKind: string
  bytesTotal: number
  bytesDone: number
  savedPaths: string[]
}

export interface QuickShareState {
  // The helper is running.
  available: boolean
  // Why it is not, for the settings page.
  reason: string
  visibility: string
  discovering: boolean
  devices: Device[]
  transfers: Transfer[]
}

interface Endpoint {
  id: string
  name: string
  deviceType: string
}

export const ENDED_STATES = new Set(['finished', 'rejected', 'cancelled', 'disconnected'])

const BLUETOOTH_PREFIX = 'ble://'

export function initialState(): QuickShareState {
  return {
    available: false,
    reason: '',
    visibility: 'invisible',
    discovering: false,
    devices: [],
    transfers: [],
  }
}

export class Endpoints {
  private readonly byId = new Map<string, Endpoint>()

  apply(event: Record<string, unknown>): void {
    const id = stringOf(event.id)
    if (event.present !== true) {
      this.byId.delete(id)
      return
    }
    this.byId.set(id, { id, name: stringOf(event.name), deviceType: stringOf(event.deviceType) })
  }

  clear(): void {
    this.byId.clear()
  }

  devices(): Device[] {
    const byName = new Map<string, Device>()
    for (const endpoint of this.byId.values()) {
      const known = byName.get(endpoint.name)
      if (known === undefined || known.id.startsWith(BLUETOOTH_PREFIX)) {
        byName.set(endpoint.name, { ...endpoint })
      }
    }
    return [...byName.values()].sort((first, second) => first.name.localeCompare(second.name))
  }
}

export function transferOf(event: Record<string, unknown>): Transfer {
  return {
    id: stringOf(event.id),
    direction: stringOf(event.direction),
    state: stringOf(event.state),
    peer: stringOf(event.peer),
    pin: stringOf(event.pin),
    files: stringListOf(event.files),
    text: stringOf(event.text),
    textKind: stringOf(event.textKind),
    bytesTotal: numberOf(event.bytesTotal, 0),
    bytesDone: numberOf(event.bytesDone, 0),
    savedPaths: stringListOf(event.savedPaths),
  }
}

export function withTransfer(transfers: Transfer[], transfer: Transfer): Transfer[] {
  const others = transfers.filter((entry) => entry.id !== transfer.id)
  return [...others, transfer]
}

export function withoutTransfer(transfers: Transfer[], id: string): Transfer[] {
  return transfers.filter((entry) => entry.id !== id)
}

export function eventOf(line: string): Record<string, unknown> | null {
  try {
    return recordOf(JSON.parse(line))
  } catch {
    console.error(`quickshare: not a protocol line: ${line}`)
    return null
  }
}
