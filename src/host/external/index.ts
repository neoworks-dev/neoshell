import GLib from 'gi://GLib'
import type { Plugin } from '@neoworks/extension-system'
import type { ExtensionModule, WidgetDeclaration } from '../../extensions/index.js'
import { fileExists, isDirectory, joinPath, readDirectory, readTextFile } from '../../gjs/fs.js'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../plugins/views.js'
import { remoteView } from '../clients/remoteView.js'
import { dbusSourcePlugin } from './dbusSource.js'
import { externalPermissions, parseExternalManifest, widgetTypeOf } from './manifest.js'
import type { ExternalManifest } from './manifest.js'

// Extensions installed programs ship, the way they ship .desktop files:
// <data dir>/neoshell/extensions/<id>/ holding manifest.json and client.js,
// in the user's data dir first and then the system's. Each becomes an
// ordinary extension module, so the gallery lists its widgets and the
// desktop may embed them like a built-in's; its views run as its client, and
// its data comes over D-Bus from the program itself.

export const BUNDLE_NAME = 'client.js'

export function externalDirectories(): string[] {
  return [GLib.get_user_data_dir(), ...GLib.get_system_data_dirs()].map((directory) =>
    joinPath(directory, 'neoshell', 'extensions'),
  )
}

/**
 * Every valid extension under `directories`, by id. The first directory to
 * hold an id keeps it, so a user's copy shadows the system's and a second
 * package claiming the same id is ignored.
 */
export function scanExternalExtensions(directories: string[], taken: Set<string>): Record<string, ExtensionModule> {
  const found: Record<string, ExtensionModule> = {}
  for (const directory of directories.filter(isDirectory)) {
    for (const name of readDirectory(directory)) {
      addExtension(found, taken, joinPath(directory, name))
    }
  }
  return found
}

function addExtension(found: Record<string, ExtensionModule>, taken: Set<string>, directory: string): void {
  const manifest = manifestIn(directory)
  if (manifest === null) {
    return
  }
  if (taken.has(manifest.id) || manifest.id in found) {
    console.warn(`extensions: ${directory} claims "${manifest.id}", which is already installed`)
    return
  }
  found[manifest.id] = externalModule(manifest, joinPath(directory, BUNDLE_NAME))
}

function manifestIn(directory: string): ExternalManifest | null {
  const text = readTextFile(joinPath(directory, 'manifest.json'))
  if (text === null || !fileExists(joinPath(directory, BUNDLE_NAME))) {
    return null
  }
  let parsed: ReturnType<typeof parseExternalManifest>
  try {
    parsed = parseExternalManifest(JSON.parse(text))
  } catch (error) {
    parsed = { ok: false, error: String(error) }
  }
  if (!parsed.ok) {
    console.warn(`extensions: ${directory}: ${parsed.error}`)
    return null
  }
  return parsed.manifest
}

export function externalModule(manifest: ExternalManifest, bundle: string): ExtensionModule {
  return {
    manifest: {
      id: manifest.id,
      inject: ['bus', 'ui'],
      widgets: manifest.widgets.map((widget) => widgetDeclarationOf(manifest, widget)),
      client: { permissions: externalPermissions(manifest), bundle },
    },
    backend: dbusSourcePlugin(manifest),
    views: externalViewsPlugin(manifest),
  }
}

function widgetDeclarationOf(manifest: ExternalManifest, widget: ExternalManifest['widgets'][number]): WidgetDeclaration {
  return {
    type: widgetTypeOf(manifest.id, widget.view),
    name: widget.name,
    category: widget.category,
    description: widget.description,
    sizes: widget.sizes,
    defaultSize: widget.defaultSize,
    source: manifest.name,
  }
}

function externalViewsPlugin(manifest: ExternalManifest): Plugin.Object {
  return {
    name: `${manifest.id}-views`,
    inject: ['ui'],
    apply(context) {
      const ui = requireService<ViewRegistry>(context, 'ui')
      for (const widget of manifest.widgets) {
        context.effect(() => ui.register(widgetTypeOf(manifest.id, widget.view), remoteView(manifest.id, widget.view)))
      }
    },
  }
}
