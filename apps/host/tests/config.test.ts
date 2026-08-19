import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Kernel } from '@neoshell/kernel'
import { Bus } from '../src/bus.js'
import { busPlugin } from '../src/plugins/bus.js'
import { configPlugin, getPath, setPath } from '../src/plugins/config.js'
import type { ConfigService } from '../src/plugins/config.js'

describe('dot-path helpers', () => {
  test('getPath walks nested objects and returns undefined off the tree', () => {
    const tree = { appearance: { background: { alpha: 0.42 } } }
    expect(getPath(tree, 'appearance.background.alpha')).toBe(0.42)
    expect(getPath(tree, 'appearance.missing.deep')).toBeUndefined()
  })

  test('setPath creates intermediate objects', () => {
    const tree: Record<string, unknown> = {}
    setPath(tree, 'bar.clock.hour12', true)
    expect(tree).toEqual({ bar: { clock: { hour12: true } } })
  })
})

describe('config store', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'neoshell-config-test-'))
  const configPath = join(tempDir, 'config.json')
  const kernel = new Kernel()

  beforeAll(async () => {
    writeFileSync(configPath, JSON.stringify({ appearance: { accent: '#a78bfa' } }))
    kernel.mount(busPlugin)
    const config = kernel.mount(configPlugin, { path: configPath })
    await config.settle()
  })

  afterAll(async () => {
    await kernel.dispose()
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('get reads the loaded file by dot-path', () => {
    const config = kernel.getService('config') as ConfigService
    expect(config.get('appearance.accent')).toBe('#a78bfa')
  })

  test('the snapshot is a retained bus topic', () => {
    const bus = kernel.getService('bus') as Bus
    const received: unknown[] = []
    const unsubscribe = bus.subscribe('config', (message) => {
      received.push(message.data)
    })

    expect(received).toHaveLength(1)
    expect(getPath(received[0] as Record<string, unknown>, 'appearance.accent')).toBe('#a78bfa')
    unsubscribe()
  })

  test('set persists to disk and republishes the retained snapshot', () => {
    const config = kernel.getService('config') as ConfigService
    const bus = kernel.getService('bus') as Bus

    config.set('dock.iconSize', 42)

    const onDisk = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>
    expect(getPath(onDisk, 'dock.iconSize')).toBe(42)

    const received: unknown[] = []
    const unsubscribe = bus.subscribe('config', (message) => {
      received.push(message.data)
    })
    expect(getPath(received[0] as Record<string, unknown>, 'dock.iconSize')).toBe(42)
    unsubscribe()
  })

  test('an external file write is picked up and republished', async () => {
    const bus = kernel.getService('bus') as Bus
    // The persist() suppression window must pass before external writes count.
    await Bun.sleep(150)
    writeFileSync(configPath, JSON.stringify({ appearance: { accent: '#ff0000' } }))
    await Bun.sleep(300)

    const received: unknown[] = []
    const unsubscribe = bus.subscribe('config', (message) => {
      received.push(message.data)
    })
    expect(getPath(received[0] as Record<string, unknown>, 'appearance.accent')).toBe('#ff0000')
    unsubscribe()
  })
})
