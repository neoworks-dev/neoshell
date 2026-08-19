import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Kernel } from '@neoshell/kernel'
import { busPlugin } from '../src/plugins/bus.js'
import { configPlugin } from '../src/plugins/config.js'
import type { ConfigService } from '../src/plugins/config.js'
import { extensionsPlugin } from '../src/plugins/extensions.js'

declare global {
  var __extensionLog: string[] | undefined
}

function extensionLog(): string[] {
  if (globalThis.__extensionLog === undefined) {
    globalThis.__extensionLog = []
  }
  return globalThis.__extensionLog
}

const MARKER_BACKEND = `
export default {
  inject: ['bus'],
  apply(context, config) {
    globalThis.__extensionLog.push('mounted ' + JSON.stringify(config))
    context.effect(() => () => {
      globalThis.__extensionLog.push('disposed')
    })
  },
}
`

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error('waitFor timed out')
    }
    await Bun.sleep(10)
  }
}

describe('extension loader', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'neoshell-extensions-test-'))
  const extensionsDir = join(tempDir, 'extensions')
  const configPath = join(tempDir, 'config.json')
  const kernel = new Kernel()
  let config = null as unknown as ConfigService

  beforeAll(async () => {
    extensionLog()
    mkdirSync(join(extensionsDir, 'marker'), { recursive: true })
    writeFileSync(
      join(extensionsDir, 'marker', 'manifest.json'),
      JSON.stringify({ id: 'marker', inject: ['bus'], backend: './backend.mjs' }),
    )
    writeFileSync(join(extensionsDir, 'marker', 'backend.mjs'), MARKER_BACKEND)
    writeFileSync(configPath, JSON.stringify({ extensions: [{ id: 'marker', config: { n: 1 } }] }))

    kernel.mount(busPlugin)
    kernel.mount(configPlugin, { path: configPath })
    kernel.mount(extensionsPlugin, { extensionsDir })
    config = null as unknown as ConfigService
    await waitFor(() => kernel.getService('config') !== undefined)
    config = kernel.getService('config') as ConfigService
  })

  afterAll(async () => {
    await kernel.dispose()
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('an enabled entry mounts with its config', async () => {
    await waitFor(() => extensionLog().length >= 1)
    expect(extensionLog()[0]).toBe('mounted {"n":1}')
  })

  test('disabling the entry disposes the extension, re-enabling remounts it', async () => {
    config.set('extensions', [{ id: 'marker', config: { n: 1 }, disabled: true }])
    await waitFor(() => extensionLog().includes('disposed'))

    config.set('extensions', [{ id: 'marker', config: { n: 1 } }])
    await waitFor(() => extensionLog().length >= 3)
    expect(extensionLog()[2]).toBe('mounted {"n":1}')
  })

  test('an entry config change remounts with the new config', async () => {
    const before = extensionLog().length
    config.set('extensions', [{ id: 'marker', config: { n: 2 } }])
    await waitFor(() => extensionLog().length >= before + 2)

    expect(extensionLog().slice(before)).toEqual(['disposed', 'mounted {"n":2}'])
  })

  test('a missing extension directory is logged and skipped without breaking others', async () => {
    const before = extensionLog().length
    config.set('extensions', [{ id: 'ghost' }, { id: 'marker', config: { n: 3 } }])
    await waitFor(() => extensionLog().length >= before + 2)

    expect(extensionLog().slice(before)).toEqual(['disposed', 'mounted {"n":3}'])
  })
})
