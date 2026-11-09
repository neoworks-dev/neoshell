import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import { registerFunction, RetainedTopics, subscribeTo } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { arrayOf, recordOf, stringListOf, stringOf } from '../../lib/record.js'
import { registerPaintable, releasePaintable } from '../../host/paintables.js'
import { thumbnailTexture } from '../neoshell/trayFiles.js'

// The desktop folder for a desktop view that runs as a client. files: takes
// any path; these take only what the desktop shows, so the client can act on
// its own icons and on nothing else:
//
//   desktop.entries      {path, entries: [{name, path, directory, icon, image, thumbnail}]}
//                        files.desktop, with a picture handle for each image
//
//   desktop:open         {path}
//   desktop:handlers     {path} → {handlers: [{id, name}]}
//   desktop:openwith     {path, handler}      handler is an id from desktop:handlers
//   desktop:rename       {path, name}
//   desktop:trash        {paths}
//   desktop:newfolder    {}
//   desktop:wallpapers   {} → {entries: [{name, path}]}
//   desktop:setwallpaper {path}               one of desktop:wallpapers
//
// A path the desktop does not show is refused with {error}.

const THUMBNAIL_PIXELS = 96
const CALL_TIMEOUT_MS = 10000
const NOT_ON_DESKTOP = { error: 'not on the desktop' }

const plugin: Plugin.Object = {
  name: 'desktop',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const folder = new DesktopFolder(bus)
    context.effect(() => () => folder.withdraw())
    context.effect(() => subscribeTo(bus, 'files.desktop', (message) => folder.apply(message.data)))
    registerFunction(context, bus, 'desktop:open', (data) => folder.forwardPath('files:open', data))
    registerFunction(context, bus, 'desktop:handlers', (data) => folder.handlers(data))
    registerFunction(context, bus, 'desktop:openwith', (data) => folder.openWith(data))
    registerFunction(context, bus, 'desktop:rename', (data) => folder.rename(data))
    registerFunction(context, bus, 'desktop:trash', (data) => folder.trash(data))
    registerFunction(context, bus, 'desktop:newfolder', () => bus.call('files:newfolder', {}, CALL_TIMEOUT_MS))
    registerFunction(context, bus, 'desktop:wallpapers', () => wallpapers(bus))
    registerFunction(context, bus, 'desktop:setwallpaper', (data) => setWallpaper(bus, data))
  },
}

export default plugin

export class DesktopFolder {
  private readonly bus: BusService
  private readonly retained: RetainedTopics
  private readonly thumbnails = new Map<string, string>()
  private paths = new Set<string>()

  constructor(bus: BusService) {
    this.bus = bus
    this.retained = new RetainedTopics(bus)
  }

  apply(data: unknown): void {
    const record = recordOf(data)
    const entries = arrayOf(record.entries)
    this.paths = new Set(entries.map((entry) => stringOf(entry.path)))
    this.releaseGone()
    const shown = entries.map((entry) => ({ ...entry, thumbnail: this.thumbnailOf(entry) }))
    this.retained.set('desktop.entries', { path: record.path, entries: shown })
  }

  withdraw(): void {
    this.retained.withdrawAll()
    for (const handle of this.thumbnails.values()) {
      releasePaintable(handle)
    }
    this.thumbnails.clear()
  }

  forwardPath(type: string, data: unknown): unknown {
    const path = stringOf(recordOf(data).path)
    if (!this.paths.has(path)) {
      return NOT_ON_DESKTOP
    }
    return this.bus.call(type, { path }, CALL_TIMEOUT_MS)
  }

  async handlers(data: unknown): Promise<unknown> {
    const listed = await this.handlersOf(stringOf(recordOf(data).path))
    return { handlers: listed.map((handler) => ({ id: handler.id, name: handler.name })) }
  }

  async openWith(data: unknown): Promise<unknown> {
    const request = recordOf(data)
    const path = stringOf(request.path)
    const chosen = (await this.handlersOf(path)).find((handler) => stringOf(handler.id) === stringOf(request.handler))
    if (chosen === undefined) {
      return { error: 'no such application for this file' }
    }
    return this.bus.call('files:openwith', { path, command: chosen.command }, CALL_TIMEOUT_MS)
  }

  rename(data: unknown): unknown {
    const request = recordOf(data)
    const path = stringOf(request.path)
    if (!this.paths.has(path)) {
      return NOT_ON_DESKTOP
    }
    return this.bus.call('files:rename', { path, name: stringOf(request.name) }, CALL_TIMEOUT_MS)
  }

  trash(data: unknown): unknown {
    const paths = stringListOf(recordOf(data).paths)
    if (paths.length === 0 || !paths.every((path) => this.paths.has(path))) {
      return NOT_ON_DESKTOP
    }
    return this.bus.call('files:trash', { paths }, CALL_TIMEOUT_MS)
  }

  private async handlersOf(path: string): Promise<Record<string, unknown>[]> {
    if (!this.paths.has(path)) {
      return []
    }
    const reply = await this.bus.call('files:handlers', { path }, CALL_TIMEOUT_MS)
    return arrayOf(recordOf(reply).handlers)
  }

  private thumbnailOf(entry: Record<string, unknown>): string {
    const path = stringOf(entry.path)
    if (entry.image !== true) {
      return ''
    }
    const known = this.thumbnails.get(path)
    if (known !== undefined) {
      return known
    }
    const texture = thumbnailTexture(path, THUMBNAIL_PIXELS)
    if (texture === null) {
      return ''
    }
    const handle = registerPaintable(texture)
    this.thumbnails.set(path, handle)
    return handle
  }

  // An image that left the desktop has its picture released.
  private releaseGone(): void {
    for (const [path, handle] of [...this.thumbnails]) {
      if (!this.paths.has(path)) {
        releasePaintable(handle)
        this.thumbnails.delete(path)
      }
    }
  }
}

async function wallpapers(bus: BusService): Promise<unknown> {
  const reply = await bus.call('files:images', {}, CALL_TIMEOUT_MS)
  const entries = arrayOf(recordOf(reply).entries)
  return { entries: entries.map((entry) => ({ name: stringOf(entry.name), path: stringOf(entry.path) })) }
}

async function setWallpaper(bus: BusService, data: unknown): Promise<unknown> {
  const path = stringOf(recordOf(data).path)
  const offered = arrayOf(recordOf(await wallpapers(bus)).entries).map((entry) => stringOf(entry.path))
  if (path === '' || !offered.includes(path)) {
    return { error: 'not in the wallpaper folder' }
  }
  return bus.call('config:set', { key: 'appearance.wallpaper', value: path }, CALL_TIMEOUT_MS)
}
