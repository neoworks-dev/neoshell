import { Kernel } from '@neoshell/kernel'
import type { Fiber, Plugin } from '@neoshell/kernel'
import { BusClient } from './busClient.js'
import { ViewRegistry } from './viewRegistry.js'

// SurfaceRuntime is the webview end of the remote-fiber bridge. It runs the
// same kernel as the host and executes the host's mount/dispose commands:
//
//   host → surface   surface.<id>.mount    {fiber, url, config}
//   surface          import(url); kernel.mount(module)
//   surface → host   surface.<id>.state    {fiber, state}
//   host → surface   surface.<id>.dispose  {fiber}
//
// On boot it announces surface.<id>.ready as a retained topic; the retained
// value dies with the WebSocket connection, so host-side readiness tracks
// webview liveness for free.

export interface SurfaceRuntimeOptions {
  surfaceId: string
  busUrl: string
  // Overrides module loading; defaults to native dynamic import, which the
  // webview resolves over HTTP. Non-browser embedders (tests) inject a loader
  // that fetches by other means.
  loadModule?: (url: string) => Promise<unknown>
}

interface MountCommand {
  fiber: string
  url: string
  config?: unknown
}

interface DisposeCommand {
  fiber: string
}

export class SurfaceRuntime {
  readonly kernel = new Kernel()
  readonly bus: BusClient
  readonly views = new ViewRegistry()
  private readonly surfaceId: string
  private readonly fibers = new Map<string, Fiber>()
  private readonly loadModule: (url: string) => Promise<unknown>

  constructor(options: SurfaceRuntimeOptions) {
    this.surfaceId = options.surfaceId
    this.bus = new BusClient(options.busUrl, options.surfaceId)
    this.loadModule = moduleLoaderOf(options)
  }

  async start(): Promise<void> {
    await this.bus.connect()
    const services = this.kernel.mount(surfaceServicesPlugin(this.bus, this.views))
    await services.settle()

    const prefix = `surface.${this.surfaceId}`
    this.bus.subscribe(`${prefix}.mount`, (message) => {
      void this.handleMount(message.data as MountCommand)
    })
    this.bus.subscribe(`${prefix}.dispose`, (message) => {
      void this.handleDispose(message.data as DisposeCommand)
    })
    this.bus.retain(`${prefix}.ready`, true)
  }

  async stop(): Promise<void> {
    await this.kernel.dispose()
    this.bus.close()
  }

  private async handleMount(command: MountCommand): Promise<void> {
    if (this.fibers.has(command.fiber)) {
      return
    }
    const plugin = await loadViewPlugin(command.url, this.loadModule)
    if (plugin === null) {
      this.reportState(command.fiber, 'failed')
      return
    }
    const fiber = this.kernel.mount(plugin, command.config)
    this.fibers.set(command.fiber, fiber)
    await fiber.settle()
    this.reportState(command.fiber, fiber.state)
  }

  private async handleDispose(command: DisposeCommand): Promise<void> {
    const fiber = this.fibers.get(command.fiber)
    if (fiber === undefined) {
      this.reportState(command.fiber, 'disposed')
      return
    }
    await fiber.dispose()
    this.fibers.delete(command.fiber)
    this.reportState(command.fiber, 'disposed')
  }

  private reportState(fiberId: string, state: string): void {
    this.bus.publish(`surface.${this.surfaceId}.state`, { fiber: fiberId, state })
  }
}

// surfaceServicesPlugin publishes the two services every view plugin builds
// on: the bus connection and the view registry.
function surfaceServicesPlugin(bus: BusClient, views: ViewRegistry): Plugin {
  return {
    name: 'surface-services',
    apply(context) {
      context.provide('bus', bus)
      context.provide('ui', views)
    },
  }
}

function moduleLoaderOf(options: SurfaceRuntimeOptions): (url: string) => Promise<unknown> {
  if (options.loadModule !== undefined) {
    return options.loadModule
  }
  return (url) => import(url)
}

async function loadViewPlugin(
  url: string,
  loadModule: (url: string) => Promise<unknown>,
): Promise<Plugin | null> {
  let module: Record<string, unknown>
  try {
    module = (await loadModule(url)) as Record<string, unknown>
  } catch (error) {
    console.error(`surface: failed to load view module ${url}:`, error)
    return null
  }
  const plugin = pickPlugin(module)
  if (plugin === null) {
    console.error(`surface: module ${url} exports no plugin (need default export or apply)`)
  }
  return plugin
}

function pickPlugin(module: Record<string, unknown>): Plugin | null {
  if (isPlugin(module.default)) {
    return module.default
  }
  if (isPlugin(module)) {
    return module
  }
  return null
}

function isPlugin(value: unknown): value is Plugin {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return typeof (value as Plugin).apply === 'function'
}
