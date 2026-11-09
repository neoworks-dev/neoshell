import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import type { Plugin } from '@neoworks/extension-system'
import { registerFunction, RetainedTopics } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { requireService } from '../../lib/services.js'
import { commandOf, sourceTopicOf, topicOf } from './manifest.js'
import type { ExternalManifest } from './manifest.js'

// The backend half of an installed program's extension: the program itself,
// reached over the session bus. It serves one object,
//
//   interface dev.neoworks.Shell.WidgetSource1  at /dev/neoworks/Shell/WidgetSource
//     method Get(topic s) → (json s)        the topic's current value
//     method Call(name s, args s) → (json s) one of the manifest's calls
//     signal Changed(topic s, json s)       a topic's new value
//
// and the shell retains each topic as ext.<id>.<topic>. Watching the name
// auto-starts it, so a program with a D-Bus service file is launched when its
// extension mounts. Only the manifest's topics and calls pass, and every
// payload is JSON.

export const WIDGET_SOURCE_INTERFACE = 'dev.neoworks.Shell.WidgetSource1'
export const WIDGET_SOURCE_PATH = '/dev/neoworks/Shell/WidgetSource'

export const WIDGET_SOURCE_XML = `<node>
  <interface name="${WIDGET_SOURCE_INTERFACE}">
    <method name="Get"><arg type="s" direction="in" name="topic"/><arg type="s" direction="out" name="json"/></method>
    <method name="Call"><arg type="s" direction="in" name="name"/><arg type="s" direction="in" name="args"/><arg type="s" direction="out" name="json"/></method>
    <signal name="Changed"><arg type="s" name="topic"/><arg type="s" name="json"/></signal>
  </interface>
</node>`

const CALL_TIMEOUT_MS = 5000
const MAX_PAYLOAD_LENGTH = 256 * 1024

export function dbusSourcePlugin(manifest: ExternalManifest): Plugin.Object {
  return {
    name: `${manifest.id}-dbus`,
    inject: ['bus'],
    apply(context) {
      const bus = requireService<BusService>(context, 'bus')
      const source = new DbusWidgetSource(bus, manifest)
      context.effect(() => source.start())
      for (const call of manifest.calls) {
        registerFunction(context, bus, commandOf(manifest.id, call), (data) => source.call(call, data))
      }
    },
  }
}

export class DbusWidgetSource {
  private readonly manifest: ExternalManifest
  private readonly retained: RetainedTopics
  private owner: string | null = null
  private signal = 0

  constructor(bus: BusService, manifest: ExternalManifest) {
    this.manifest = manifest
    this.retained = new RetainedTopics(bus)
  }

  start(): () => void {
    this.retained.set(sourceTopicOf(this.manifest.id), { available: false })
    const watch = Gio.bus_watch_name(
      Gio.BusType.SESSION,
      this.manifest.dbus,
      Gio.BusNameWatcherFlags.AUTO_START,
      (_connection: Gio.DBusConnection, _name: string, owner: string) => this.appeared(owner),
      () => this.vanished(),
    )
    return () => {
      Gio.bus_unwatch_name(watch)
      this.unsubscribe()
      this.retained.withdrawAll()
    }
  }

  async call(name: string, data: unknown): Promise<unknown> {
    if (this.owner === null) {
      return { error: `${this.manifest.name} is not running` }
    }
    const json = await this.invoke(this.owner, 'Call', new GLib.Variant('(ss)', [name, JSON.stringify(data)]))
    return payloadOf(json)
  }

  private appeared(owner: string): void {
    this.unsubscribe()
    this.owner = owner
    this.signal = Gio.DBus.session.signal_subscribe(
      owner,
      WIDGET_SOURCE_INTERFACE,
      'Changed',
      WIDGET_SOURCE_PATH,
      null,
      Gio.DBusSignalFlags.NONE,
      (_connection, _sender, _path, _iface, _signal, parameters) => this.changed(parameters),
    )
    this.retained.set(sourceTopicOf(this.manifest.id), { available: true })
    for (const topic of this.manifest.topics) {
      void this.fetch(owner, topic)
    }
  }

  private vanished(): void {
    this.unsubscribe()
    this.owner = null
    this.retained.set(sourceTopicOf(this.manifest.id), { available: false })
  }

  private unsubscribe(): void {
    if (this.signal === 0) {
      return
    }
    Gio.DBus.session.signal_unsubscribe(this.signal)
    this.signal = 0
  }

  private changed(parameters: GLib.Variant): void {
    const [topic, json] = parameters.deepUnpack<[string, string]>()
    this.take(topic, json)
  }

  private async fetch(owner: string, topic: string): Promise<void> {
    try {
      this.take(topic, await this.invoke(owner, 'Get', new GLib.Variant('(s)', [topic])))
    } catch (error) {
      console.warn(`${this.manifest.id}: Get("${topic}") failed:`, error)
    }
  }

  private take(topic: string, json: string): void {
    if (!this.manifest.topics.includes(topic)) {
      return
    }
    const data = payloadOf(json)
    if (data === undefined) {
      console.warn(`${this.manifest.id}: "${topic}" is not JSON of at most ${MAX_PAYLOAD_LENGTH} characters`)
      return
    }
    this.retained.set(topicOf(this.manifest.id, topic), data)
  }

  private invoke(owner: string, method: string, args: GLib.Variant): Promise<string> {
    return new Promise((resolve, reject) => {
      Gio.DBus.session.call(
        owner,
        WIDGET_SOURCE_PATH,
        WIDGET_SOURCE_INTERFACE,
        method,
        args,
        new GLib.VariantType('(s)'),
        Gio.DBusCallFlags.NONE,
        CALL_TIMEOUT_MS,
        null,
        (connection, result) => settle(connection, result, resolve, reject),
      )
    })
  }
}

function settle(
  connection: Gio.DBusConnection | null,
  result: Gio.AsyncResult,
  resolve: (json: string) => void,
  reject: (error: Error) => void,
): void {
  if (connection === null) {
    reject(new Error('no session bus'))
    return
  }
  try {
    const [json] = connection.call_finish(result).deepUnpack<[string]>()
    resolve(json)
  } catch (error) {
    reject(error as Error)
  }
}

function payloadOf(json: string): unknown {
  if (json.length > MAX_PAYLOAD_LENGTH) {
    return undefined
  }
  try {
    const parsed: unknown = JSON.parse(json)
    return parsed
  } catch {
    return undefined
  }
}
