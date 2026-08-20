import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Kernel } from '@neoshell/kernel'
import { SurfaceRuntime } from '@neoshell/surface'
import { busPlugin } from '../src/plugins/bus.js'
import { configPlugin } from '../src/plugins/config.js'
import type { ConfigService } from '../src/plugins/config.js'
import { httpPlugin } from '../src/plugins/http.js'
import type { HttpService } from '../src/plugins/http.js'
import { surfacesPlugin } from '../src/plugins/surfaces.js'
import { viewTreePlugin } from '../src/plugins/viewTree.js'

// The whole pipeline, render host excluded: config tree → retained "views"
// topic → view-module mounts into a live SurfaceRuntime → registered types.

const VIEWS_MODULE = `
export default {
  name: 'demo-views',
  inject: ['ui'],
  apply(context) {
    const ui = context.require('ui')
    context.effect(() => ui.register('demo.panel', () => ({ dispose() {} })))
  },
}
`

const TREE = [
  {
    id: 'bar',
    type: 'demo.panel',
    args: { layer: 'top', anchors: ['top'], keyboard: 'none' },
  },
]

function makeTestLoader(dir: string): (url: string) => Promise<unknown> {
  let counter = 0
  return async (url) => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`fetch ${url}: ${response.status}`)
    }
    counter += 1
    const file = join(dir, `fetched-${counter}.mjs`)
    writeFileSync(file, await response.text())
    return import(file)
  }
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

describe('view tree', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'neoshell-viewtree-test-'))
  const extensionsDir = join(tempDir, 'extensions')
  const configPath = join(tempDir, 'config.json')
  const kernel = new Kernel()
  let runtime = null as unknown as SurfaceRuntime
  let config = null as unknown as ConfigService

  beforeAll(async () => {
    mkdirSync(join(extensionsDir, 'demo', 'dist'), { recursive: true })
    writeFileSync(join(extensionsDir, 'demo', 'manifest.json'), JSON.stringify({
      id: 'demo',
      views: 'views.js',
    }))
    writeFileSync(join(extensionsDir, 'demo', 'dist', 'views.js'), VIEWS_MODULE)
    writeFileSync(configPath, JSON.stringify({ views: TREE }))

    kernel.mount(busPlugin)
    kernel.mount(configPlugin, { path: configPath })
    kernel.mount(httpPlugin, { port: 0, pluginsDir: extensionsDir })
    kernel.mount(surfacesPlugin)
    const tree = kernel.mount(viewTreePlugin, { extensionsDir })
    await tree.settle()
    await waitFor(() => kernel.getService('http') !== undefined)
    config = kernel.getService('config') as ConfigService

    const port = (kernel.getService('http') as HttpService).port
    runtime = new SurfaceRuntime({
      surfaceId: 'bar',
      busUrl: `ws://127.0.0.1:${port}/ws`,
      loadModule: makeTestLoader(tempDir),
    })
    await runtime.start()
  })

  afterAll(async () => {
    await runtime.stop()
    await kernel.dispose()
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('the surface receives the views module and registers its types', async () => {
    await waitFor(() => runtime.views.resolve('demo.panel') !== undefined)
    expect(runtime.views.resolve('demo.panel')).toBeDefined()
  })

  test('the tree is a retained topic surfaces can render from', async () => {
    const received: unknown[] = []
    const unsubscribe = runtime.bus.subscribe('views', (message) => {
      received.push(message.data)
    })
    await waitFor(() => received.length >= 1)

    expect(received[0]).toEqual(TREE)
    unsubscribe()
  })

  test('removing the surface from the tree disposes its view mounts', async () => {
    config.set('views', [])
    await waitFor(() => runtime.views.resolve('demo.panel') === undefined)
  })
})
