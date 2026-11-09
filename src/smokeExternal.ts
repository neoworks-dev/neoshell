import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import { Context } from '@neoworks/extension-system'
import type { Plugin } from '@neoworks/extension-system'
import type { Bus } from './host/bus.js'
import type { ViewRegistry } from './host/plugins/views.js'
import { runtimePlugin } from './host/plugins/runtime.js'
import { addExtensions, EXTENSIONS } from './extensions/index.js'
import { scanExternalExtensions } from './host/external/index.js'
import { parseExternalManifest } from './host/external/manifest.js'
import { WIDGET_SOURCE_PATH, WIDGET_SOURCE_XML } from './host/external/dbusSource.js'
import { joinPath } from './gjs/fs.js'
import { recordOf } from './lib/record.js'

// The smoke's installed program: the fixture extension smoke.mjs lays out in
// dist/external, mounted the way main.ts mounts one, and its data source,
// which this process serves on the session bus under the fixture's name.

const SMOKE_DBUS_NAME = 'dev.neoworks.Shell.SmokeSource'
const SMOKE_ID = 'dev.neoworks.smoke'
const CHANGE_AFTER_MS = 600

export const SMOKE_EXTERNAL_TEXT = 'Smoke changed over D-Bus'

export interface SmokeExternal {
  // What is wrong, or null.
  failure(): string | null
}

export function startSmokeExternal(bus: Bus, registry: ViewRegistry): SmokeExternal {
  const exported = serveSource()
  addExtensions(scanExternalExtensions([joinPath(GLib.get_current_dir(), 'dist', 'external')], new Set(Object.keys(EXTENSIONS))))
  const extension = EXTENSIONS[SMOKE_ID]
  if (extension === undefined) {
    return { failure: () => 'the fixture extension in dist/external was not found' }
  }
  const root = new Context()
  root.plugin(runtimePlugin as Plugin.Object, { bus, registry })
  root.plugin(extension.backend as Plugin.Object)
  root.plugin(extension.views as Plugin.Object)
  let pong = false
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, CHANGE_AFTER_MS, () => {
    emitChanged(exported, 'status', { text: SMOKE_EXTERNAL_TEXT })
    emitChanged(exported, 'secret', { text: 'unlisted' })
    void bus.call(`ext.${SMOKE_ID}:ping`, { count: 1 }).then((reply) => {
      pong = recordOf(reply).pong === true
    })
    return GLib.SOURCE_REMOVE
  })
  return { failure: () => failureOf(bus, registry, pong) }
}

function failureOf(bus: Bus, registry: ViewRegistry, pong: boolean): string | null {
  if (registry.resolve(`${SMOKE_ID}.card`) === undefined) {
    return 'the external widget\'s view type was not registered'
  }
  if (!pong) {
    return 'a call did not reach the program over D-Bus'
  }
  if (retains(bus, `ext.${SMOKE_ID}.secret`)) {
    return 'a topic the manifest does not list was retained'
  }
  return manifestFailure()
}

function retains(bus: Bus, topic: string): boolean {
  let found = false
  bus.subscribe(topic, () => {
    found = true
  })()
  return found
}

function manifestFailure(): string | null {
  const valid = { id: 'dev.example.ok', name: 'Ok', dbus: 'dev.example.Ok', widgets: [{ view: 'card', name: 'Ok', description: '', sizes: ['small'], defaultSize: 'small' }] }
  if (!parseExternalManifest(valid).ok) {
    return 'a valid external manifest was refused'
  }
  const refused = [{ ...valid, id: 'weather' }, { ...valid, topics: ['a.b'] }, { ...valid, calls: ['*'] }, { ...valid, topics: ['source'] }]
  if (refused.some((manifest) => parseExternalManifest(manifest).ok)) {
    return 'an external manifest reaching outside its namespace was accepted'
  }
  return null
}

function serveSource(): Gio.DBusExportedObject {
  const exported = Gio.DBusExportedObject.wrapJSObject(WIDGET_SOURCE_XML, {
    Get: (topic: string) => JSON.stringify({ text: `Smoke ${topic}` }),
    Call: (name: string) => JSON.stringify({ pong: name === 'ping' }),
  })
  exported.export(Gio.DBus.session, WIDGET_SOURCE_PATH)
  Gio.bus_own_name_on_connection(Gio.DBus.session, SMOKE_DBUS_NAME, Gio.BusNameOwnerFlags.NONE, null, null)
  return exported
}

function emitChanged(exported: Gio.DBusExportedObject, topic: string, data: unknown): void {
  exported.emit_signal('Changed', new GLib.Variant('(ss)', [topic, JSON.stringify(data)]))
}
