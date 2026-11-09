import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import { registerFunction, RetainedTopics, subscribeTo } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { recordOf, stringListOf, stringOf } from '../../lib/record.js'
import { valueAt } from '../../lib/settings.svelte.js'
import { filesOfDrop } from '../../host/drops.js'
import { pathOfFile, registerFile, releaseFile } from '../../host/fileHandles.js'
import { thumbnailHandle } from '../../host/paintables.js'
import { deleteCachedCopy } from '../neoshell/trayDownloads.js'
import { STAGED_KEY, tileOf, withPaths, withoutPath } from '../neoshell/trayFiles.js'

// The notch's Tray, kept here rather than in its view: the view runs as a
// client, which may not read files, fetch URLs or name a path. It sees the
// Tray as tiles with handles and acts on them by handle or drop token.
//
//   tray.files    {files: [{file, path, name, icon, thumbnail, missing}]}
//                 file is a file handle (drag-files, tray:open/remove),
//                 thumbnail a picture handle or ''
//
//   tray:keep     {drop}           the drop's files join the Tray
//   tray:remove   {file}
//   tray:clear    {}
//   tray:open     {file}
//   tray:count    {drop}  → {count}  how many files a drop brought
//   tray:share    {drop, device}   sends a drop's files over Quick Share
//
// Files that arrive over Quick Share join it too. The list itself lives in
// config under notch.staged.

const THUMBNAIL_PIXELS = 104
const CALL_TIMEOUT_MS = 10000

const plugin: Plugin.Object = {
  name: 'tray',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const tray = new Tray(bus)
    context.effect(() => () => tray.withdraw())
    context.effect(() => subscribeTo(bus, 'config', (message) => tray.applyConfig(message.data)))
    context.effect(() =>
      subscribeTo(bus, 'quickshare:received', (message) => tray.keep(stringListOf(recordOf(message.data).paths))),
    )
    registerFunction(context, bus, 'tray:keep', async (data) => tray.keep(await filesOfDrop(recordOf(data).drop)))
    registerFunction(context, bus, 'tray:remove', (data) => tray.remove(recordOf(data).file))
    registerFunction(context, bus, 'tray:clear', () => tray.clear())
    registerFunction(context, bus, 'tray:open', (data) => tray.open(recordOf(data).file))
    registerFunction(context, bus, 'tray:count', async (data) => ({
      count: (await filesOfDrop(recordOf(data).drop)).length,
    }))
    registerFunction(context, bus, 'tray:share', (data) => tray.share(recordOf(data)))
  },
}

export default plugin

class Tray {
  private readonly bus: BusService
  private readonly retained: RetainedTopics
  private staged: string[] = []

  constructor(bus: BusService) {
    this.bus = bus
    this.retained = new RetainedTopics(bus)
  }

  applyConfig(snapshot: unknown): void {
    this.staged = stringListOf(valueAt(recordOf(snapshot), STAGED_KEY))
    this.retained.set('tray.files', { files: this.staged.map(tileFor) })
  }

  withdraw(): void {
    this.retained.withdrawAll()
  }

  keep(paths: string[]): { ok: boolean } {
    if (paths.length === 0) {
      return { ok: true }
    }
    this.write(withPaths(this.staged, paths))
    return { ok: true }
  }

  remove(file: unknown): { ok: boolean } {
    const path = this.stagedPathOf(file)
    if (path === null) {
      return { ok: false }
    }
    this.write(withoutPath(this.staged, path))
    forget(path)
    return { ok: true }
  }

  clear(): { ok: boolean } {
    const removed = this.staged
    this.write([])
    removed.forEach(forget)
    return { ok: true }
  }

  open(file: unknown): unknown {
    const path = this.stagedPathOf(file)
    if (path === null) {
      return { ok: false }
    }
    return this.bus.call('files:open', { path }, CALL_TIMEOUT_MS)
  }

  async share(request: Record<string, unknown>): Promise<unknown> {
    const files = await filesOfDrop(request.drop)
    if (files.length === 0) {
      return { ok: false }
    }
    return this.bus.call('quickshare:send', { device: stringOf(request.device), files }, CALL_TIMEOUT_MS)
  }

  // A handle names a file only while it is in the Tray.
  private stagedPathOf(file: unknown): string | null {
    const path = pathOfFile(file)
    if (path === null || !this.staged.includes(path)) {
      return null
    }
    return path
  }

  private write(paths: string[]): void {
    this.bus.call('config:set', { key: STAGED_KEY, value: paths }, CALL_TIMEOUT_MS).catch((error: unknown) => {
      console.error('tray: writing the Tray failed:', error)
    })
  }
}

function tileFor(path: string): Record<string, unknown> {
  const tile = tileOf(path)
  return {
    file: registerFile(path),
    path,
    name: tile.name,
    icon: tile.icon,
    thumbnail: thumbnailOf(tile.thumbnail),
    missing: tile.missing,
  }
}

function thumbnailOf(image: string): string {
  if (image === '') {
    return ''
  }
  return thumbnailHandle(image, THUMBNAIL_PIXELS)
}

function forget(path: string): void {
  releaseFile(path)
  deleteCachedCopy(path)
}
