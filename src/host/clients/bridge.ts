import type { Bus, BusMessage } from '../bus.js'
import type { BusAnswer, BusRequest } from '../../lib/remoteBus.js'
import { CONFIG_TOPIC, mayCall, mayPublish, maySubscribe, readableConfig } from './permissions.js'
import type { ClientPermissions } from './permissions.js'

// One client's bus: requests from the client are checked against its
// permissions and carried out on the host bus, and what the bus answers goes
// back as plain JSON. Everything the client holds — subscriptions, retained
// topics — is released when it goes away, so a crashing client leaks nothing.

const MAX_SUBSCRIPTIONS = 256

export class BusBridge {
  private readonly bus: Bus
  private readonly name: string
  private readonly permissions: ClientPermissions
  private readonly answer: (answer: BusAnswer) => void
  private readonly subscriptions = new Map<number, () => void>()
  private readonly retained = new Map<number, () => void>()
  private readonly refusedOnce = new Set<string>()

  constructor(bus: Bus, name: string, permissions: ClientPermissions, answer: (answer: BusAnswer) => void) {
    this.bus = bus
    this.name = name
    this.permissions = permissions
    this.answer = answer
  }

  handle(request: unknown): void {
    if (!isRequest(request)) {
      return
    }
    switch (request.bus) {
      case 'subscribe':
        this.subscribe(request.sub, request.pattern)
        return
      case 'unsubscribe':
        this.release(this.subscriptions, request.sub)
        return
      case 'publish':
        this.publish(request.type, request.data)
        return
      case 'retain':
        this.retain(request.key, request.type, request.data)
        return
      case 'release':
        this.release(this.retained, request.key)
        return
      case 'call':
        void this.call(request.call, request.type, request.data, request.timeout)
        return
    }
  }

  /** The client is gone; nothing it held stays behind. */
  reset(): void {
    for (const dispose of [...this.subscriptions.values(), ...this.retained.values()]) {
      dispose()
    }
    this.subscriptions.clear()
    this.retained.clear()
  }

  private subscribe(sub: number, pattern: string): void {
    if (!maySubscribe(this.permissions, pattern)) {
      this.refuse(`subscribe ${pattern}`)
      return
    }
    if (this.subscriptions.size >= MAX_SUBSCRIPTIONS || this.subscriptions.has(sub)) {
      this.refuse('subscribe beyond its limit')
      return
    }
    // A retained topic replays inside subscribe(), before the disposer is
    // stored; that is fine, the answer only needs the number.
    const dispose = this.bus.subscribe(pattern, (message) => {
      this.answer({ bus: 'message', sub, message: { type: message.type, data: this.visibleData(message) } })
    })
    this.subscriptions.set(sub, dispose)
  }

  private visibleData(message: BusMessage): unknown {
    if (message.type === CONFIG_TOPIC) {
      return plain(readableConfig(this.permissions, message.data))
    }
    return plain(message.data)
  }

  private publish(type: string, data: unknown): void {
    if (!mayPublish(this.permissions, type)) {
      this.refuse(`publish ${type}`)
      return
    }
    this.bus.publish(type, data)
  }

  private retain(key: number, type: string, data: unknown): void {
    if (!mayPublish(this.permissions, type) || this.retained.has(key)) {
      this.refuse(`retain ${type}`)
      return
    }
    this.retained.set(key, this.bus.retain(type, data))
  }

  private release(held: Map<number, () => void>, key: number): void {
    const dispose = held.get(key)
    if (dispose === undefined) {
      return
    }
    held.delete(key)
    dispose()
  }

  private async call(call: number, type: string, data: unknown, timeout: number): Promise<void> {
    if (!mayCall(this.permissions, type, data)) {
      this.refuse(`call ${type}`)
      this.answer({ bus: 'reply', call, ok: false, error: `${this.name} may not call ${type}` })
      return
    }
    try {
      const result = await this.bus.call(type, data, timeoutOf(timeout))
      this.answer({ bus: 'reply', call, ok: true, result: plain(result) })
    } catch (error) {
      this.answer({ bus: 'reply', call, ok: false, error: String(error) })
    }
  }

  private refuse(what: string): void {
    if (this.refusedOnce.has(what)) {
      return
    }
    this.refusedOnce.add(what)
    console.warn(`${this.name}: not permitted to ${what}`)
  }
}

const MAX_TIMEOUT_MS = 60_000

function timeoutOf(requested: unknown): number {
  if (typeof requested !== 'number' || !Number.isFinite(requested) || requested <= 0) {
    return 10_000
  }
  return Math.min(requested, MAX_TIMEOUT_MS)
}

// Only what survives JSON crosses; a GObject in a payload arrives as nothing.
function plain(value: unknown): unknown {
  if (value === undefined) {
    return null
  }
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return null
  }
}

const REQUESTS = new Set(['subscribe', 'unsubscribe', 'publish', 'retain', 'release', 'call'])

function isRequest(value: unknown): value is BusRequest {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  if (!REQUESTS.has(String(record.bus))) {
    return false
  }
  return hasFields(record)
}

function hasFields(record: Record<string, unknown>): boolean {
  switch (record.bus) {
    case 'subscribe':
      return typeof record.sub === 'number' && typeof record.pattern === 'string'
    case 'unsubscribe':
      return typeof record.sub === 'number'
    case 'publish':
      return typeof record.type === 'string'
    case 'retain':
      return typeof record.key === 'number' && typeof record.type === 'string'
    case 'release':
      return typeof record.key === 'number'
    default:
      return typeof record.call === 'number' && typeof record.type === 'string'
  }
}
