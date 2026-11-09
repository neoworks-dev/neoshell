import type { BusMessage, BusService } from './bus.js'

// The bus as a client sees it: the same BusService a view in the shell gets,
// carried as app messages over the client's connection. The host's bridge
// (host/clients/bridge.ts) answers them, checking each against the client's
// permissions.

export type BusRequest =
  | { bus: 'subscribe'; sub: number; pattern: string }
  | { bus: 'unsubscribe'; sub: number }
  | { bus: 'publish'; type: string; data: unknown }
  | { bus: 'retain'; key: number; type: string; data: unknown }
  | { bus: 'release'; key: number }
  | { bus: 'call'; call: number; type: string; data: unknown; timeout: number }

export type BusAnswer =
  | { bus: 'message'; sub: number; message: BusMessage }
  | { bus: 'reply'; call: number; ok: true; result: unknown }
  | { bus: 'reply'; call: number; ok: false; error: string }

const DEFAULT_TIMEOUT_MS = 10_000

interface PendingCall {
  resolve(result: unknown): void
  reject(error: Error): void
  timer: ReturnType<typeof setTimeout>
}

export class RemoteBus implements BusService {
  private readonly send: (request: BusRequest) => void
  private readonly handlers = new Map<number, (message: BusMessage) => void>()
  private readonly calls = new Map<number, PendingCall>()
  private nextSubscription = 1
  private nextCall = 1
  private nextRetain = 1

  constructor(send: (request: BusRequest) => void) {
    this.send = send
  }

  publish(type: string, data: unknown): void {
    this.send({ bus: 'publish', type, data })
  }

  retain(type: string, data: unknown): () => void {
    const key = this.nextRetain++
    this.send({ bus: 'retain', key, type, data })
    return () => this.send({ bus: 'release', key })
  }

  subscribe(pattern: string, handler: (message: BusMessage) => void): () => void {
    const sub = this.nextSubscription++
    this.handlers.set(sub, handler)
    this.send({ bus: 'subscribe', sub, pattern })
    return () => {
      this.handlers.delete(sub)
      this.send({ bus: 'unsubscribe', sub })
    }
  }

  call(type: string, data: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
    const call = this.nextCall++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.calls.delete(call)
        reject(new Error(`bus: call "${type}" timed out after ${timeoutMs}ms`))
      }, timeoutMs)
      this.calls.set(call, { resolve, reject, timer })
      this.send({ bus: 'call', call, type, data, timeout: timeoutMs })
    })
  }

  receive(answer: BusAnswer): void {
    if (answer.bus === 'message') {
      this.deliver(answer.sub, answer.message)
      return
    }
    this.settle(answer)
  }

  private deliver(sub: number, message: BusMessage): void {
    const handler = this.handlers.get(sub)
    if (handler !== undefined) {
      handler(message)
    }
  }

  private settle(answer: Extract<BusAnswer, { bus: 'reply' }>): void {
    const pending = this.calls.get(answer.call)
    if (pending === undefined) {
      return
    }
    this.calls.delete(answer.call)
    clearTimeout(pending.timer)
    if (answer.ok) {
      pending.resolve(answer.result)
      return
    }
    pending.reject(new Error(answer.error))
  }
}
