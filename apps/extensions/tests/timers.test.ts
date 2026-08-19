import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Kernel } from '@neoshell/kernel'
import type { Fiber, Plugin } from '@neoshell/kernel'
import timersExtension from '../timers/backend.js'

interface FakeMessage {
  type: string
  data: unknown
  replyTo?: string
}

// In-memory bus with exact-match dispatch — the extension subscribes exact
// function names and replies to exact reply topics.
class FakeBus {
  readonly retained = new Map<string, unknown>()
  private readonly handlers = new Map<string, Set<(message: FakeMessage) => void>>()

  publish(type: string, data: unknown, replyTo?: string): void {
    const set = this.handlers.get(type)
    if (set === undefined) {
      return
    }
    for (const handler of [...set]) {
      handler({ type, data, replyTo })
    }
  }

  retain(type: string, data: unknown): () => void {
    this.retained.set(type, data)
    return () => {
      this.retained.delete(type)
    }
  }

  subscribe(pattern: string, handler: (message: FakeMessage) => void): () => void {
    let set = this.handlers.get(pattern)
    if (set === undefined) {
      set = new Set()
      this.handlers.set(pattern, set)
    }
    set.add(handler)
    return () => {
      set.delete(handler)
    }
  }

  // call publishes with a reply topic and returns the reply synchronously —
  // the extension's handlers reply inline.
  call(type: string, data: unknown): unknown {
    let reply: unknown
    const replyTo = `reply.test.${Math.random()}`
    const unsubscribe = this.subscribe(replyTo, (message) => {
      reply = message.data
    })
    this.publish(type, data, replyTo)
    unsubscribe()
    return reply
  }
}

interface TimersSnapshot {
  timers: Array<{ id: string; label: string; endsAt: number }>
  sessions: Array<{ id: string; label: string; startedAt: number; stoppedAt: number }>
}

function retainedSnapshot(bus: FakeBus): TimersSnapshot {
  return bus.retained.get('timers') as TimersSnapshot
}

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error('waitFor timed out')
    }
    await Bun.sleep(10)
  }
}

function busProvider(bus: FakeBus): Plugin {
  return {
    name: 'fake-bus',
    apply(context) {
      context.provide('bus', bus)
    },
  }
}

describe('timers extension', () => {
  const cleanups: Array<() => Promise<void> | void> = []

  afterEach(async () => {
    for (const cleanup of cleanups.reverse()) {
      await cleanup()
    }
    cleanups.length = 0
  })

  async function mountTimers(dataPath: string): Promise<{ bus: FakeBus; fiber: Fiber }> {
    const kernel = new Kernel()
    const bus = new FakeBus()
    kernel.mount(busProvider(bus))
    const fiber = kernel.mount(timersExtension, { dataPath, tickMs: 20, notify: false })
    await fiber.settle()
    cleanups.push(() => kernel.dispose())
    return { bus, fiber }
  }

  function makeDataPath(): string {
    const dir = mkdtempSync(join(tmpdir(), 'neoshell-timers-test-'))
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }))
    return join(dir, 'timers.json')
  }

  test('timer:start adds a retained timer, timer:stop removes it, state persists', async () => {
    const dataPath = makeDataPath()
    const { bus } = await mountTimers(dataPath)

    const started = bus.call('timer:start', { seconds: 3600, label: 'tea' }) as { id: string }
    expect(typeof started.id).toBe('string')
    expect(retainedSnapshot(bus).timers).toHaveLength(1)
    expect(retainedSnapshot(bus).timers[0].label).toBe('tea')
    expect(existsSync(dataPath)).toBe(true)

    bus.call('timer:stop', { id: started.id })
    expect(retainedSnapshot(bus).timers).toHaveLength(0)
  })

  test('an invalid duration is rejected', async () => {
    const { bus } = await mountTimers(makeDataPath())

    const reply = bus.call('timer:start', { seconds: -5 }) as { error?: string }
    expect(reply.error).toContain('positive')
    expect(retainedSnapshot(bus).timers).toHaveLength(0)
  })

  test('an expired timer leaves the state on the next tick', async () => {
    const { bus } = await mountTimers(makeDataPath())

    bus.call('timer:start', { seconds: 0.01, label: 'blink' })
    expect(retainedSnapshot(bus).timers).toHaveLength(1)

    await waitFor(() => retainedSnapshot(bus).timers.length === 0)
  })

  test('track:start and track:stop record a labeled span', async () => {
    const { bus } = await mountTimers(makeDataPath())

    const started = bus.call('track:start', { label: 'deep work' }) as { id: string }
    let sessions = retainedSnapshot(bus).sessions
    expect(sessions[0].stoppedAt).toBe(0)

    const stopped = bus.call('track:stop', {}) as { id: string }
    expect(stopped.id).toBe(started.id)
    sessions = retainedSnapshot(bus).sessions
    expect(sessions[0].stoppedAt).toBeGreaterThan(0)

    const again = bus.call('track:stop', {}) as { error?: string }
    expect(again.error).toBe('no running session')
  })

  test('state survives a restart through the data file', async () => {
    const dataPath = makeDataPath()
    const first = await mountTimers(dataPath)
    first.bus.call('timer:start', { seconds: 3600, label: 'persist me' })
    await first.fiber.dispose()
    expect(first.bus.retained.has('timers')).toBe(false)

    const second = await mountTimers(dataPath)
    expect(retainedSnapshot(second.bus).timers[0].label).toBe('persist me')
  })
})
