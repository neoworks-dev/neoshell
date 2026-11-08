import type { BusService } from './bus.js'
import { subscribeTo } from './bus.js'

// Settings as a view reads and writes them: the retained "config" snapshot,
// held reactively, addressed by the same dot-paths config:set takes. A view
// creates one and connects it from an effect:
//
//   const settings = new Settings(bus)
//   $effect(() => settings.connect())
//   const openOn = $derived(settings.string('notch.openOn', 'click'))

const WRITE_TIMEOUT_MS = 2000

export class Settings {
  private readonly bus: BusService
  private snapshot = $state<Record<string, unknown>>({})

  constructor(bus: BusService) {
    this.bus = bus
  }

  connect(): () => void {
    return subscribeTo(this.bus, 'config', (message) => {
      this.snapshot = recordOf(message.data)
    })
  }

  value(key: string): unknown {
    return valueAt(this.snapshot, key)
  }

  string(key: string, fallback: string): string {
    const found = this.value(key)
    if (typeof found !== 'string') {
      return fallback
    }
    return found
  }

  number(key: string, fallback: number): number {
    const found = this.value(key)
    if (typeof found !== 'number') {
      return fallback
    }
    return found
  }

  boolean(key: string, fallback: boolean): boolean {
    const found = this.value(key)
    if (typeof found !== 'boolean') {
      return fallback
    }
    return found
  }

  set(key: string, value: unknown): void {
    this.bus.call('config:set', { key, value }, WRITE_TIMEOUT_MS).catch((error: unknown) => {
      console.error(`settings: writing ${key} failed:`, error)
    })
  }
}

export function valueAt(root: Record<string, unknown>, key: string): unknown {
  let current: unknown = root
  for (const part of key.split('.')) {
    current = recordOf(current)[part]
  }
  return current
}

function recordOf(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {}
  }
  return value as Record<string, unknown>
}
