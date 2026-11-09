import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import { registerFunction, RetainedTopics, subscribeTo } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record.js'
import { readTextFile } from '../../gjs/fs.js'
import { registerPaintable, releasePaintable } from '../../host/paintables.js'

// What the dock needs from the machine, which its view, running as a client,
// may not do itself:
//
//   dock.windows   [{address, class, title, workspace: {name}, command}]
//                  hypr.windows, with each window's process name from /proc
//
//   dock:capture   {address, width, height} → {handle} | {error}
//                  a window's frame as a picture handle; the previous frame of
//                  that window, and a closed window's, are released
//
//   dock:launch    {exec} → {ok} | {error}
//                  runs a command only when an installed application or the
//                  configured dock.apps carries it
//
// A client is never given apps:launch itself, which runs any command.

const MAX_CAPTURE_WIDTH = 560
const MAX_CAPTURE_HEIGHT = 340
const CALL_TIMEOUT_MS = 10000

const plugin: Plugin.Object = {
  name: 'dock',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const retained = new RetainedTopics(bus)
    const captures = new Captures(bus)
    let configuredExecs: string[] = []
    context.effect(() => () => retained.withdrawAll())
    context.effect(() => () => captures.releaseAll())
    context.effect(() =>
      subscribeTo(bus, 'hypr.windows', (message) => {
        const windows = arrayOf(message.data).map(dockWindowOf)
        retained.set('dock.windows', windows)
        captures.keepOnly(windows.map((window) => stringOf(window.address)))
      }),
    )
    context.effect(() =>
      subscribeTo(bus, 'config', (message) => {
        configuredExecs = configuredExecsOf(message.data)
      }),
    )
    registerFunction(context, bus, 'dock:capture', (data) => captures.capture(recordOf(data)))
    registerFunction(context, bus, 'dock:launch', (data) => launch(bus, stringOf(recordOf(data).exec), configuredExecs))
  },
}

export default plugin

function dockWindowOf(record: Record<string, unknown>): Record<string, unknown> {
  return {
    address: record.address,
    class: record.class,
    title: record.title,
    workspace: { name: recordOf(record.workspace).name },
    command: commandOfPid(record.pid),
  }
}

function commandOfPid(pid: unknown): string {
  if (typeof pid !== 'number' || pid <= 0) {
    return ''
  }
  const comm = readTextFile(`/proc/${pid}/comm`)
  if (comm === null) {
    return ''
  }
  return comm.trim()
}

function configuredExecsOf(snapshot: unknown): string[] {
  const apps = arrayOf(recordOf(recordOf(snapshot).dock).apps)
  return apps.map((app) => stringOf(app.exec)).filter((exec) => exec !== '')
}

async function launch(bus: BusService, exec: string, configuredExecs: string[]): Promise<unknown> {
  if (!isLaunchable(exec, configuredExecs, await installedExecs(bus))) {
    return { error: 'not an installed application' }
  }
  return bus.call('apps:launch', { command: exec }, CALL_TIMEOUT_MS)
}

/** Whether the dock may run `exec`: exactly what an app it knows of runs. */
export function isLaunchable(exec: string, configuredExecs: string[], installedExecs: string[]): boolean {
  if (exec === '') {
    return false
  }
  return configuredExecs.includes(exec) || installedExecs.includes(exec)
}

async function installedExecs(bus: BusService): Promise<string[]> {
  const reply = await bus.call('apps:list', {}, CALL_TIMEOUT_MS)
  return arrayOf(reply).map((app) => stringOf(app.exec))
}

class Captures {
  private readonly bus: BusService
  private readonly handles = new Map<string, string>()

  constructor(bus: BusService) {
    this.bus = bus
  }

  async capture(request: Record<string, unknown>): Promise<unknown> {
    const address = stringOf(request.address)
    const reply = recordOf(
      await this.bus.call(
        'hypr:capture',
        {
          address,
          width: Math.min(MAX_CAPTURE_WIDTH, numberOf(request.width, MAX_CAPTURE_WIDTH)),
          height: Math.min(MAX_CAPTURE_HEIGHT, numberOf(request.height, MAX_CAPTURE_HEIGHT)),
        },
        CALL_TIMEOUT_MS,
      ),
    )
    if (reply.texture === undefined || reply.texture === null) {
      return { error: stringOf(reply.error) }
    }
    this.release(address)
    const handle = registerPaintable(reply.texture)
    this.handles.set(address, handle)
    return { handle }
  }

  keepOnly(addresses: string[]): void {
    for (const address of [...this.handles.keys()]) {
      if (!addresses.includes(address)) {
        this.release(address)
      }
    }
  }

  releaseAll(): void {
    for (const address of [...this.handles.keys()]) {
      this.release(address)
    }
  }

  private release(address: string): void {
    const handle = this.handles.get(address)
    if (handle === undefined) {
      return
    }
    releasePaintable(handle)
    this.handles.delete(address)
  }
}
