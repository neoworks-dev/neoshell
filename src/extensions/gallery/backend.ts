import type { Plugin } from '@neoworks/extension-system'
import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import { RetainedTopics, registerFunction } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { sectionOf } from '../../lib/config.js'
import { numberOf, recordOf } from '../../lib/record.js'
import { requireService } from '../../lib/services.js'
import { startPolling } from '../../lib/poll.js'
import { pathOfFile, registerFile, releaseFile } from '../../host/fileHandles.js'
import { thumbnailHandle } from '../../host/paintables.js'
import {
  MAX_IMAGES,
  folderPathOf,
  isImageName,
  newestFirst,
  normalizeInterval,
  normalizeLayout,
  shuffled,
} from './library.js'
import type { ImageFile } from './library.js'
import { shortFolder } from './topic.js'

// gallery: the pictures of one folder as a retained topic, and thumbnails and
// "open" for the widget, which runs sandboxed and only ever holds handles.
//
//   gallery.library    {folder (home shown as ~), status, images: [{file, name}], count,
//                       intervalSeconds, shuffle, layout, version}
//   gallery:thumbnail  {file, pixels} → {handle} | {error}
//   gallery:open       {file} → {ok} | {error}
//
// Settings come from the config topic's "gallery" section:
//
//   "gallery": {"folder": "~/Pictures", "intervalSeconds": 6, "shuffle": false, "layout": "grid"}
//
// status is ok, empty (a folder with no pictures) or missing (no such folder).
// The folder is walked a few levels deep, skipping hidden directories.

const RESCAN_MINUTES = 5
const MAX_DEPTH = 3
const MAX_VISITED_ENTRIES = 6000
const MIN_THUMBNAIL_PIXELS = 64
const MAX_THUMBNAIL_PIXELS = 1024
const CALL_TIMEOUT_MS = 10000
const SCAN_ATTRIBUTES = 'standard::name,standard::type,time::modified'

interface GalleryOptions {
  folder: string
  intervalSeconds: number
  shuffle: boolean
  layout: string
}

const galleryExtension: Plugin.Object = {
  name: 'gallery',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const topics = new RetainedTopics(bus)
    context.effect(() => () => topics.withdrawAll())
    const gallery = new Gallery(bus, topics)
    context.effect(() => () => gallery.releaseHandles())
    context.effect(() =>
      bus.subscribe('config', (message) => {
        gallery.configure(message.data)
      }),
    )
    registerFunction(context, bus, 'gallery:thumbnail', (data) => gallery.thumbnail(data))
    registerFunction(context, bus, 'gallery:open', (data) => gallery.open(data))
    startPolling(context, RESCAN_MINUTES * 60_000, () => Promise.resolve(gallery.rescan()))
  },
}

export default galleryExtension

class Gallery {
  private readonly bus: BusService
  private readonly topics: RetainedTopics
  private options = optionsOf({})
  private optionsSignature = ''
  private images: ImageFile[] = []
  private handles = new Map<string, string>()
  private status = 'ok'
  private version = 0

  constructor(bus: BusService, topics: RetainedTopics) {
    this.bus = bus
    this.topics = topics
  }

  // Config republishes on every edit anywhere. Only the folder and the order
  // need a new walk; the interval and layout just republish.
  configure(snapshot: unknown): void {
    const next = optionsOf(sectionOf(snapshot, 'gallery'))
    const signature = JSON.stringify([next.folder, next.shuffle])
    const needsScan = signature !== this.optionsSignature
    this.options = next
    this.optionsSignature = signature
    if (needsScan) {
      this.rescan()
      return
    }
    this.publish()
  }

  rescan(): void {
    const found = scanFolder(this.options.folder)
    this.status = statusOf(found)
    this.images = orderedImages(found.images, this.options.shuffle)
    this.rememberHandles()
    this.version += 1
    this.publish()
  }

  releaseHandles(): void {
    for (const path of this.handles.keys()) {
      releaseFile(path)
    }
    this.handles.clear()
  }

  thumbnail(data: unknown): Record<string, unknown> {
    const request = recordOf(data)
    const path = this.knownPath(request.file)
    if (path === null) {
      return { error: 'unknown picture' }
    }
    const pixels = clampedPixels(request.pixels)
    const handle = thumbnailHandle(path, pixels)
    if (handle === '') {
      return { error: 'unreadable picture' }
    }
    return { handle }
  }

  async open(data: unknown): Promise<Record<string, unknown>> {
    const path = this.knownPath(recordOf(data).file)
    if (path === null) {
      return { error: 'unknown picture' }
    }
    const reply = await this.bus.call('files:open', { path }, CALL_TIMEOUT_MS)
    return recordOf(reply)
  }

  private knownPath(handle: unknown): string | null {
    const path = pathOfFile(handle)
    if (path === null || !this.handles.has(path)) {
      return null
    }
    return path
  }

  private rememberHandles(): void {
    const kept = new Set(this.images.map((image) => image.path))
    for (const path of this.handles.keys()) {
      if (!kept.has(path)) {
        releaseFile(path)
        this.handles.delete(path)
      }
    }
    for (const image of this.images) {
      this.handles.set(image.path, registerFile(image.path))
    }
  }

  private publish(): void {
    this.topics.set('gallery.library', {
      folder: shortFolder(this.options.folder, GLib.get_home_dir()),
      status: this.status,
      images: this.images.map((image) => ({ file: this.handles.get(image.path), name: image.name })),
      count: this.images.length,
      intervalSeconds: this.options.intervalSeconds,
      shuffle: this.options.shuffle,
      layout: this.options.layout,
      version: this.version,
    })
  }
}

function optionsOf(section: Record<string, unknown>): GalleryOptions {
  const home = GLib.get_home_dir()
  return {
    folder: folderPathOf(section.folder, home, defaultFolder(home)),
    intervalSeconds: normalizeInterval(section.intervalSeconds),
    shuffle: section.shuffle === true,
    layout: normalizeLayout(section.layout),
  }
}

function defaultFolder(home: string): string {
  const pictures = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES)
  if (pictures === null) {
    return `${home}/Pictures`
  }
  return pictures
}

function orderedImages(images: ImageFile[], shuffle: boolean): ImageFile[] {
  const limited = newestFirst(images).slice(0, MAX_IMAGES)
  if (shuffle) {
    return shuffled(limited, Math.random)
  }
  return limited
}

interface Scan {
  exists: boolean
  images: ImageFile[]
}

function statusOf(scan: Scan): string {
  if (!scan.exists) {
    return 'missing'
  }
  if (scan.images.length === 0) {
    return 'empty'
  }
  return 'ok'
}

function scanFolder(folder: string): Scan {
  if (!GLib.file_test(folder, GLib.FileTest.IS_DIR)) {
    return { exists: false, images: [] }
  }
  const images: ImageFile[] = []
  const budget = { visited: 0 }
  walk(folder, 0, images, budget)
  return { exists: true, images }
}

function walk(directory: string, depth: number, images: ImageFile[], budget: { visited: number }): void {
  const enumerator = openEnumerator(directory)
  if (enumerator === null) {
    return
  }
  for (;;) {
    const info = enumerator.next_file(null)
    if (info === null || budget.visited >= MAX_VISITED_ENTRIES) {
      break
    }
    budget.visited += 1
    visit(directory, info, depth, images, budget)
  }
  enumerator.close(null)
}

function visit(
  directory: string,
  info: Gio.FileInfo,
  depth: number,
  images: ImageFile[],
  budget: { visited: number },
): void {
  const name = info.get_name()
  if (name.startsWith('.')) {
    return
  }
  const path = `${directory}/${name}`
  if (info.get_file_type() === Gio.FileType.DIRECTORY) {
    if (depth < MAX_DEPTH) {
      walk(path, depth + 1, images, budget)
    }
    return
  }
  if (isImageName(name)) {
    images.push({ path, name, modified: info.get_attribute_uint64('time::modified') })
  }
}

function openEnumerator(directory: string): Gio.FileEnumerator | null {
  try {
    return Gio.File.new_for_path(directory).enumerate_children(SCAN_ATTRIBUTES, Gio.FileQueryInfoFlags.NONE, null)
  } catch {
    return null
  }
}

function clampedPixels(value: unknown): number {
  const pixels = numberOf(value, MIN_THUMBNAIL_PIXELS)
  return Math.min(MAX_THUMBNAIL_PIXELS, Math.max(MIN_THUMBNAIL_PIXELS, Math.round(pixels)))
}
