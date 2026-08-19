// BusClient is the webview's end of the host bus: the wire protocol from
// apps/host/src/wire.ts spoken over a WebSocket. Subscriptions are dispatched
// locally by pattern; the server additionally replays retained topics on
// subscribe.

export interface BusMessage {
  type: string
  data: unknown
  replyTo?: string
}

export type BusHandler = (message: BusMessage) => void

interface SubscriptionEntry {
  pattern: string
  handler: BusHandler
}

// Keep in sync with matchesPattern in apps/host/src/bus.ts: exact match, or a
// trailing "*" matching any suffix.
export function matchesPattern(pattern: string, type: string): boolean {
  if (pattern === type) {
    return true
  }
  if (!pattern.endsWith('*')) {
    return false
  }
  return type.startsWith(pattern.slice(0, -1))
}

export class BusClient {
  private socket: WebSocket | null = null
  private readonly subscriptions = new Set<SubscriptionEntry>()
  private readonly sentPatterns = new Set<string>()
  private nextReplyId = 1
  private readonly url: string
  private readonly replyPrefix: string

  // clientId namespaces reply topics so parallel clients never collide;
  // callers pass the surface id.
  constructor(url: string, clientId: string) {
    this.url = url
    this.replyPrefix = `reply.${clientId}`
  }

  async connect(): Promise<void> {
    const socket = new WebSocket(this.url)
    this.socket = socket
    socket.onmessage = (event) => {
      this.handleFrame(String(event.data))
    }
    await socketOpen(socket, this.url)
    this.sendRaw({ subscribe: [`${this.replyPrefix}.*`] })
  }

  close(): void {
    if (this.socket !== null) {
      this.socket.close()
    }
  }

  publish(type: string, data: unknown, replyTo?: string): void {
    this.sendRaw({ type, data, replyTo })
  }

  // retain stores the last value host-side; it is withdrawn automatically when
  // this connection closes, so a dead webview leaves nothing behind.
  retain(type: string, data: unknown): void {
    this.sendRaw({ type, data, retain: true })
  }

  subscribe(pattern: string, handler: BusHandler): () => void {
    const entry: SubscriptionEntry = { pattern, handler }
    this.subscriptions.add(entry)
    if (!this.sentPatterns.has(pattern)) {
      this.sentPatterns.add(pattern)
      this.sendRaw({ subscribe: [pattern] })
    }
    return () => {
      this.subscriptions.delete(entry)
    }
  }

  call(type: string, data: unknown, timeoutMs = 10_000): Promise<unknown> {
    const replyTo = `${this.replyPrefix}.${this.nextReplyId}`
    this.nextReplyId += 1
    return new Promise((resolve, reject) => {
      this.awaitReply(replyTo, type, timeoutMs, resolve, reject)
      this.publish(type, data, replyTo)
    })
  }

  private awaitReply(
    replyTo: string,
    type: string,
    timeoutMs: number,
    resolve: (data: unknown) => void,
    reject: (error: Error) => void,
  ): void {
    const unsubscribe = this.subscribe(replyTo, (message) => {
      unsubscribe()
      clearTimeout(timer)
      resolve(message.data)
    })
    const timer = setTimeout(() => {
      unsubscribe()
      reject(new Error(`bus: call "${type}" timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  }

  private handleFrame(raw: string): void {
    const message = parseFrame(raw)
    if (message === null) {
      return
    }
    for (const entry of [...this.subscriptions]) {
      deliverIfMatching(entry, message)
    }
  }

  private sendRaw(payload: Record<string, unknown>): void {
    if (this.socket === null) {
      throw new Error('bus: not connected')
    }
    this.socket.send(JSON.stringify(payload))
  }
}

function deliverIfMatching(entry: SubscriptionEntry, message: BusMessage): void {
  if (!matchesPattern(entry.pattern, message.type)) {
    return
  }
  entry.handler(message)
}

function parseFrame(raw: string): BusMessage | null {
  try {
    const parsed = JSON.parse(raw) as BusMessage
    if (typeof parsed.type !== 'string') {
      return null
    }
    return parsed
  } catch (error) {
    console.error('surface: bad bus frame:', error)
    return null
  }
}

function socketOpen(socket: WebSocket, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.onopen = () => resolve()
    socket.onerror = () => reject(new Error(`bus: websocket ${url} failed to connect`))
  })
}
