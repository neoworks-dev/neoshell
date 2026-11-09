import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import { defaultPolicy, RemoteClient } from '@neoworks/svelte-gtk4/host'
import type { ClientStatus } from '@neoworks/svelte-gtk4/host'
import type { Bus } from '../bus.js'
import { joinPath } from '../../gjs/fs.js'
import type { BusAnswer } from '../../lib/remoteBus.js'
import { BusBridge } from './bridge.js'
import type { ClientPermissions } from './permissions.js'
import { clientArgv, DEFAULT_RUNNER_LIMITS } from './sandbox.js'
import type { RunnerLimits } from './sandbox.js'

// Every view that runs as a client goes through here. One runner process per
// client bundle, started when its first view mounts and stopped a while after
// its last one goes; one bus bridge per process, reset whenever the process
// is replaced. A rebuilt bundle restarts its client in place.

export interface ClientDeclaration {
  permissions: ClientPermissions
  limits?: Partial<RunnerLimits>
}

export type StatusListener = (status: ClientStatus, detail: string) => void

export interface MountedClientView {
  update(props: Record<string, unknown>): void
  unmount(): void
}

interface Running {
  client: RemoteClient
  bridge: BusBridge
  views: number
  listeners: Set<StatusListener>
  stopTimer: number
  monitor: Gio.FileMonitor | null
}

// Long enough that a view re-rendered on a config change finds its client
// still running.
const IDLE_STOP_MS = 30_000

export class ClientManager {
  private readonly bus: Bus
  private readonly declarationOf: (name: string) => ClientDeclaration | undefined
  private readonly running = new Map<string, Running>()

  constructor(bus: Bus, declarationOf: (name: string) => ClientDeclaration | undefined) {
    this.bus = bus
    this.declarationOf = declarationOf
  }

  mount(
    name: string,
    view: string,
    props: Record<string, unknown>,
    anchor: unknown,
    onStatus: StatusListener,
  ): MountedClientView {
    const running = this.runningFor(name)
    running.views += 1
    cancelStop(running)
    running.listeners.add(onStatus)
    onStatus(running.client.status, '')
    const instance = running.client.mount(view, props, anchor as never)
    return {
      update: (next) => running.client.update(instance, next),
      unmount: () => {
        running.client.unmount(instance)
        running.listeners.delete(onStatus)
        running.views -= 1
        this.stopWhenIdle(name, running)
      },
    }
  }

  retry(name: string): void {
    const running = this.running.get(name)
    if (running !== undefined) {
      running.client.retry()
    }
  }

  stopAll(): void {
    for (const [name, running] of this.running) {
      this.stop(name, running)
    }
  }

  private runningFor(name: string): Running {
    const existing = this.running.get(name)
    if (existing !== undefined) {
      return existing
    }
    const created = this.start(name)
    this.running.set(name, created)
    return created
  }

  private start(name: string): Running {
    const declaration = this.declarationOf(name)
    const permissions = permissionsOf(declaration)
    const bundle = bundlePath(name)
    const listeners = new Set<StatusListener>()
    let client: RemoteClient | null = null
    const bridge = new BusBridge(this.bus, name, permissions, (answer: BusAnswer) => {
      if (client !== null) {
        client.sendApp(answer)
      }
    })
    client = new RemoteClient({
      name: `client ${name}`,
      argv: clientArgv(runnerPath(), bundle, limitsOf(declaration)),
      policy: defaultPolicy(`client:${name}`),
      onApp: (data) => bridge.handle(data),
      onStatus: (status, detail) => {
        if (status === 'restarting' || status === 'failed') {
          bridge.reset()
        }
        for (const listener of listeners) {
          listener(status, detail)
        }
      },
    })
    const running: Running = { client, bridge, views: 0, listeners, stopTimer: 0, monitor: null }
    running.monitor = this.watchBundle(bundle, running)
    client.start()
    return running
  }

  // A rebuilt bundle replaces the running client, which mounts every view again.
  private watchBundle(bundle: string, running: Running): Gio.FileMonitor | null {
    try {
      const monitor = Gio.File.new_for_path(bundle).monitor_file(Gio.FileMonitorFlags.NONE, null)
      monitor.connect('changed', (_monitor, _file, _other, event) => {
        if (event !== Gio.FileMonitorEvent.CHANGES_DONE_HINT) {
          return
        }
        running.client.stop()
        running.bridge.reset()
        running.client.start()
      })
      return monitor
    } catch {
      return null
    }
  }

  private stopWhenIdle(name: string, running: Running): void {
    if (running.views > 0) {
      return
    }
    cancelStop(running)
    running.stopTimer = GLib.timeout_add(GLib.PRIORITY_LOW, IDLE_STOP_MS, () => {
      running.stopTimer = 0
      this.stop(name, running)
      return GLib.SOURCE_REMOVE
    })
  }

  private stop(name: string, running: Running): void {
    cancelStop(running)
    if (running.monitor !== null) {
      running.monitor.cancel()
    }
    running.client.stop()
    running.bridge.reset()
    this.running.delete(name)
  }
}

function cancelStop(running: Running): void {
  if (running.stopTimer === 0) {
    return
  }
  GLib.source_remove(running.stopTimer)
  running.stopTimer = 0
}

function permissionsOf(declaration: ClientDeclaration | undefined): ClientPermissions {
  if (declaration === undefined) {
    return { subscribe: [], call: [], publish: [], configKeys: [] }
  }
  return declaration.permissions
}

function limitsOf(declaration: ClientDeclaration | undefined): RunnerLimits {
  if (declaration === undefined || declaration.limits === undefined) {
    return DEFAULT_RUNNER_LIMITS
  }
  return { ...DEFAULT_RUNNER_LIMITS, ...declaration.limits }
}

// Next to the shell's own bundle, which is run from the checkout like
// style.css is.
function bundlePath(name: string): string {
  return joinPath(GLib.get_current_dir(), 'dist', 'clients', `${name}.js`)
}

function runnerPath(): string {
  const override = GLib.getenv('NEOSHELL_RUNNER')
  if (override !== null && override !== '') {
    return override
  }
  return joinPath(
    GLib.get_current_dir(),
    'node_modules',
    '@neoworks',
    'svelte-gtk4',
    'runner',
    'target',
    'release',
    'svelte-gtk4-runner',
  )
}
