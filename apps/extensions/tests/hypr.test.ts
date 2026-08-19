import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Socket } from 'bun'
import { Kernel } from '@neoshell/kernel'
import type { Fiber } from '@neoshell/kernel'
import hyprExtension from '../hypr/backend.js'
import { busProvider, FakeBus, waitFor } from './helpers.js'

// FakeHyprland: the two IPC sockets with mutable state. The request socket
// answers one command per connection and closes, like the real compositor;
// the event socket streams lines to every connected client.
class FakeHyprland {
  state: Record<string, unknown> = {
    clients: [{ class: 'firefox', title: 'Mozilla Firefox' }],
    workspaces: [{ id: 1, name: '1' }],
    activeworkspace: { id: 1, name: '1' },
    activewindow: { class: 'firefox' },
    monitors: [{ id: 0, name: 'HDMI-A-1' }],
  }
  readonly commands: string[] = []
  private requestListener: { stop(closeActive?: boolean): void } | null = null
  private eventListener: { stop(closeActive?: boolean): void } | null = null
  private readonly eventClients = new Set<Socket<undefined>>()

  start(requestSocket: string, eventSocket: string): void {
    const fake = this
    this.requestListener = Bun.listen<undefined>({
      unix: requestSocket,
      socket: {
        data(socket, chunk) {
          fake.answer(socket, chunk.toString())
        },
      },
    })
    this.eventListener = Bun.listen<undefined>({
      unix: eventSocket,
      socket: {
        open(socket) {
          fake.eventClients.add(socket)
        },
        close(socket) {
          fake.eventClients.delete(socket)
        },
        data() {},
      },
    })
  }

  stop(): void {
    if (this.requestListener !== null) {
      this.requestListener.stop(true)
    }
    if (this.eventListener !== null) {
      this.eventListener.stop(true)
    }
  }

  emitEvent(line: string): void {
    for (const client of this.eventClients) {
      client.write(line + '\n')
    }
  }

  private answer(socket: Socket<undefined>, command: string): void {
    this.commands.push(command)
    socket.write(this.replyFor(command))
    socket.end()
  }

  private replyFor(command: string): string {
    if (command.startsWith('j/')) {
      const query = command.slice(2)
      return JSON.stringify(this.state[query])
    }
    return 'ok'
  }
}

describe('hypr extension', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'neoshell-hypr-test-'))
  const requestSocket = join(tempDir, 'request.sock')
  const eventSocket = join(tempDir, 'events.sock')
  const fake = new FakeHyprland()
  const kernel = new Kernel()
  const bus = new FakeBus()
  let fiber = null as unknown as Fiber

  beforeAll(async () => {
    fake.start(requestSocket, eventSocket)
    kernel.mount(busProvider(bus))
    fiber = kernel.mount(hyprExtension, { requestSocket, eventSocket })
    await fiber.settle()
  })

  afterAll(async () => {
    await kernel.dispose()
    fake.stop()
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('publishes the compositor state as retained topics on start', async () => {
    await waitFor(() => bus.retained.has('hypr.monitors'))

    expect(bus.retained.get('hypr.windows')).toEqual([
      { class: 'firefox', title: 'Mozilla Firefox' },
    ])
    expect(bus.retained.get('hypr.activeworkspace')).toEqual({ id: 1, name: '1' })
  })

  test('a compositor event publishes hypr.event and refreshes the snapshots', async () => {
    fake.state.clients = [{ class: 'kitty', title: 'kitty' }]
    fake.emitEvent('openwindow>>abc123,1,kitty,kitty')

    await waitFor(() =>
      bus.published.some((message) => message.type === 'hypr.event'),
    )
    const event = bus.published.find((message) => message.type === 'hypr.event')
    expect(event?.data).toEqual({ event: 'openwindow', data: 'abc123,1,kitty,kitty' })

    await waitFor(() => {
      const windows = bus.retained.get('hypr.windows') as Array<{ class: string }>
      return windows[0].class === 'kitty'
    })
  })

  test('hypr:dispatch reaches the compositor socket', async () => {
    const reply = (await bus.call('hypr:dispatch', { dispatcher: 'exec', arg: 'kitty' })) as {
      ok?: boolean
    }
    expect(reply.ok).toBe(true)
    await waitFor(() => fake.commands.includes('dispatch exec kitty'))
  })

  test('hypr:request returns the raw reply, invalid calls return errors', async () => {
    const reply = (await bus.call('hypr:request', { command: 'version' })) as { reply?: string }
    expect(reply.reply).toBe('ok')

    const bad = (await bus.call('hypr:dispatch', {})) as { error?: string }
    expect(bad.error).toContain('required')
  })

  test('disposal withdraws every retained topic', async () => {
    await fiber.dispose()
    expect(bus.retained.size).toBe(0)
  })
})
