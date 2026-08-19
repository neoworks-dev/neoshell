import { join } from 'node:path'
import type { Context, Fiber, Plugin } from '@neoshell/kernel'
import type { Bus } from '../bus.js'

// extensionsPlugin is the loader: it reads the mount list from config (the
// "extensions" key — flat, Cordis-shaped) and mounts each enabled extension's
// backend as a child fiber. The list is read from the retained "config" topic,
// so edits apply live: disabling an entry disposes its fiber, enabling mounts
// it, a config change remounts.
//
// An extension is a directory under extensionsDir:
//   <dir>/<name>/manifest.json   {id, inject?, provides?, backend?, views?}
//   <dir>/<name>/<backend>       module default-exporting a Plugin

export interface ExtensionsConfig {
  extensionsDir: string
}

interface ExtensionEntry {
  id: string
  name?: string
  config?: unknown
  disabled?: boolean
}

interface ExtensionManifest {
  id: string
  inject?: string[]
  provides?: string[]
  backend?: string
  views?: string
}

export const extensionsPlugin: Plugin<ExtensionsConfig> = {
  name: 'extensions',
  inject: ['bus', 'config'],
  apply(context, config) {
    const bus = context.require<Bus>('bus')
    const loader = new ExtensionLoader(context, config.extensionsDir)
    // The retained config snapshot replays on subscribe, so this both loads
    // the initial list and follows every later change.
    context.effect(() =>
      bus.subscribe('config', (message) => {
        loader.applyFromSnapshot(message.data)
      }),
    )
  },
}

class ExtensionLoader {
  private readonly context: Context
  private readonly extensionsDir: string
  private readonly mounted = new Map<string, { fiber: Fiber; signature: string }>()
  private queue: Promise<void> = Promise.resolve()

  constructor(context: Context, extensionsDir: string) {
    this.context = context
    this.extensionsDir = extensionsDir
  }

  // applyFromSnapshot serializes list applications so overlapping config
  // changes never interleave mounts and unmounts.
  applyFromSnapshot(snapshot: unknown): void {
    const entries = entriesOf(snapshot)
    this.queue = this.queue.then(() => this.applyList(entries)).catch(logApplyError)
  }

  settle(): Promise<void> {
    return this.queue
  }

  private async applyList(entries: ExtensionEntry[]): Promise<void> {
    const desired = new Map<string, ExtensionEntry>()
    for (const entry of entries) {
      addIfEnabled(desired, entry)
    }
    await this.unmountStale(desired)
    await this.mountMissing(desired)
  }

  private async unmountStale(desired: Map<string, ExtensionEntry>): Promise<void> {
    for (const [id, mountedExtension] of [...this.mounted]) {
      await this.unmountIfStale(id, mountedExtension.signature, desired)
    }
  }

  private async unmountIfStale(
    id: string,
    signature: string,
    desired: Map<string, ExtensionEntry>,
  ): Promise<void> {
    const entry = desired.get(id)
    if (entry !== undefined && signatureOf(entry) === signature) {
      return
    }
    const mountedExtension = this.mounted.get(id)
    if (mountedExtension === undefined) {
      return
    }
    await mountedExtension.fiber.dispose()
    this.mounted.delete(id)
  }

  private async mountMissing(desired: Map<string, ExtensionEntry>): Promise<void> {
    for (const [id, entry] of desired) {
      await this.mountIfMissing(id, entry)
    }
  }

  private async mountIfMissing(id: string, entry: ExtensionEntry): Promise<void> {
    if (this.mounted.has(id)) {
      return
    }
    const plugin = await this.loadBackend(entry)
    if (plugin === null) {
      return
    }
    const fiber = this.context.plugin(plugin, entry.config)
    this.mounted.set(id, { fiber, signature: signatureOf(entry) })
  }

  private async loadBackend(entry: ExtensionEntry): Promise<Plugin | null> {
    const dir = join(this.extensionsDir, nameOf(entry))
    const manifest = await readManifest(dir)
    if (manifest === null) {
      return null
    }
    if (manifest.backend === undefined) {
      // Views-only extension; its view half mounts through the view tree.
      return null
    }
    return importBackend(join(dir, manifest.backend), manifest, entry)
  }
}

async function importBackend(
  modulePath: string,
  manifest: ExtensionManifest,
  entry: ExtensionEntry,
): Promise<Plugin | null> {
  let module: Record<string, unknown>
  try {
    module = (await import(modulePath)) as Record<string, unknown>
  } catch (error) {
    console.error(`extensions: failed to load backend ${modulePath}:`, error)
    return null
  }
  const base = pickPlugin(module)
  if (base === null) {
    console.error(`extensions: ${modulePath} exports no plugin`)
    return null
  }
  return wrapPlugin(base, manifest, entry)
}

// wrapPlugin renames the plugin to its entry id and lets the manifest's inject
// override the module's, so the manifest stays the declaration of record.
function wrapPlugin(base: Plugin, manifest: ExtensionManifest, entry: ExtensionEntry): Plugin {
  let inject = base.inject
  if (manifest.inject !== undefined) {
    inject = manifest.inject
  }
  return {
    name: entry.id,
    inject,
    apply(context, config) {
      return base.apply(context, config)
    },
  }
}

async function readManifest(dir: string): Promise<ExtensionManifest | null> {
  const path = join(dir, 'manifest.json')
  try {
    const manifest = (await Bun.file(path).json()) as ExtensionManifest
    if (typeof manifest.id !== 'string' || manifest.id === '') {
      console.error(`extensions: manifest ${path} is missing an id`)
      return null
    }
    return manifest
  } catch (error) {
    console.error(`extensions: cannot read manifest ${path}:`, error)
    return null
  }
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

function entriesOf(snapshot: unknown): ExtensionEntry[] {
  if (typeof snapshot !== 'object' || snapshot === null) {
    return []
  }
  const list = (snapshot as Record<string, unknown>).extensions
  if (!Array.isArray(list)) {
    return []
  }
  return list.filter(isExtensionEntry)
}

function isExtensionEntry(value: unknown): value is ExtensionEntry {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const id = (value as ExtensionEntry).id
  return typeof id === 'string' && id !== ''
}

function addIfEnabled(desired: Map<string, ExtensionEntry>, entry: ExtensionEntry): void {
  if (entry.disabled === true) {
    return
  }
  desired.set(entry.id, entry)
}

function nameOf(entry: ExtensionEntry): string {
  if (entry.name !== undefined && entry.name !== '') {
    return entry.name
  }
  return entry.id
}

function signatureOf(entry: ExtensionEntry): string {
  return JSON.stringify({ name: nameOf(entry), config: entry.config })
}

function logApplyError(error: unknown): void {
  console.error('extensions: apply failed:', error)
}
