import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import { registerFunction, RetainedTopics, subscribeTo } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { recordOf, stringOf } from '../../lib/record.js'
import { registerPaintable, releasePaintable } from '../../host/paintables.js'
import { focusedWorkspace, hideDispatches, restoreDispatches, stillOpen, windowsOn } from './reveal.js'
import type { Dispatch, WindowToHide } from './reveal.js'

// reveal: showing the desktop. The windows on the focused workspace go away
// and come back as a strip down the left edge, where a click brings them
// back out.
//
//   reveal.state    {hidden, reason, windows: [{address, title, appClass, handle}]}
//                   handle is a picture of the window taken as it went
//   reveal:hide     {reason}  → {ok}
//   reveal:restore  {focus?}  → {ok}   focus: the window to bring to the front
//   reveal:toggle   {reason}  → {ok}
//
// The widget gallery opening shows the desktop, and its closing brings back
// what it hid; a hot corner or anything else uses reveal:toggle.

interface HiddenWindow extends WindowToHide {
  handle: string
}

interface Hidden {
  workspace: number
  reason: string
  windows: HiddenWindow[]
}

const CALL_TIMEOUT_MS = 5000
const PICTURE_WIDTH = 360
const PICTURE_HEIGHT = 240
const GALLERY_REASON = 'gallery'

const plugin: Plugin.Object = {
  name: 'reveal',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const revealer = new Revealer(bus)
    context.effect(() => revealer.start())
    context.effect(() => subscribeTo(bus, 'hypr.windows', (message) => revealer.applyWindows(message.data)))
    context.effect(() => subscribeTo(bus, 'hypr.monitors', (message) => revealer.applyMonitors(message.data)))
    context.effect(() => subscribeTo(bus, 'widgets:gallery', (message) => revealer.applyGallery(message.data)))
    registerFunction(context, bus, 'reveal:hide', (data) => revealer.hide(reasonOf(data)))
    registerFunction(context, bus, 'reveal:restore', (data) => revealer.restore(stringOf(recordOf(data).focus)))
    registerFunction(context, bus, 'reveal:toggle', (data) => revealer.toggle(reasonOf(data)))
  },
}

export default plugin

class Revealer {
  private readonly bus: BusService
  private readonly retained: RetainedTopics
  private windows: unknown = []
  private monitors: unknown = []
  private hidden: Hidden | null = null
  // One change at a time: a toggle landing while windows are still moving
  // would otherwise hide half of them twice.
  private queue: Promise<unknown> = Promise.resolve()

  constructor(bus: BusService) {
    this.bus = bus
    this.retained = new RetainedTopics(bus)
  }

  start(): () => void {
    this.publish()
    return () => {
      void this.restore('')
      this.retained.withdrawAll()
    }
  }

  applyWindows(windows: unknown): void {
    this.windows = windows
    this.dropClosed()
  }

  applyMonitors(monitors: unknown): void {
    this.monitors = monitors
  }

  applyGallery(data: unknown): void {
    if (recordOf(data).open === true) {
      void this.hide(GALLERY_REASON)
      return
    }
    if (this.hidden !== null && this.hidden.reason === GALLERY_REASON) {
      void this.restore('')
    }
  }

  hide(reason: string): Promise<unknown> {
    return this.serialized(() => this.hideNow(reason))
  }

  restore(focus: string): Promise<unknown> {
    return this.serialized(() => this.restoreNow(focus))
  }

  toggle(reason: string): Promise<unknown> {
    return this.serialized(() => {
      if (this.hidden === null) {
        return this.hideNow(reason)
      }
      return this.restoreNow('')
    })
  }

  private serialized(step: () => Promise<unknown>): Promise<unknown> {
    const next = this.queue.then(step, step)
    this.queue = next
    return next
  }

  private async hideNow(reason: string): Promise<unknown> {
    const workspace = focusedWorkspace(this.monitors)
    if (this.hidden !== null || workspace === null) {
      return { ok: true }
    }
    const windows = windowsOn(this.windows, workspace.id)
    // Pictures first: a window on a hidden workspace is not drawn any more.
    const pictured = await Promise.all(windows.map((window) => this.pictured(window)))
    await this.dispatchAll(hideDispatches(windows))
    this.hidden = { workspace: workspace.id, reason, windows: pictured }
    this.publish()
    return { ok: true }
  }

  private async restoreNow(focus: string): Promise<unknown> {
    const hidden = this.hidden
    if (hidden === null) {
      return { ok: true }
    }
    this.hidden = null
    this.publish()
    const addresses = hidden.windows.map((window) => window.address)
    await this.dispatchAll(restoreDispatches(addresses, hidden.workspace, focus))
    releasePictures(hidden.windows)
    return { ok: true }
  }

  private async pictured(window: WindowToHide): Promise<HiddenWindow> {
    try {
      const reply = recordOf(
        await this.bus.call(
          'hypr:capture',
          { address: window.address, width: PICTURE_WIDTH, height: PICTURE_HEIGHT },
          CALL_TIMEOUT_MS,
        ),
      )
      if (reply.texture === undefined || reply.texture === null) {
        return { ...window, handle: '' }
      }
      return { ...window, handle: registerPaintable(reply.texture) }
    } catch {
      return { ...window, handle: '' }
    }
  }

  private async dispatchAll(dispatches: Dispatch[]): Promise<void> {
    for (const dispatch of dispatches) {
      await this.bus.call('hypr:dispatch', dispatch, CALL_TIMEOUT_MS)
    }
  }

  // A window closed while it was hidden leaves the strip; with none left
  // there is nothing to bring back.
  private dropClosed(): void {
    const hidden = this.hidden
    if (hidden === null) {
      return
    }
    const open = stillOpen(
      hidden.windows.map((window) => window.address),
      this.windows,
    )
    if (open.length === hidden.windows.length) {
      return
    }
    const closed = hidden.windows.filter((window) => !open.includes(window.address))
    releasePictures(closed)
    this.hidden = { ...hidden, windows: hidden.windows.filter((window) => open.includes(window.address)) }
    if (this.hidden.windows.length === 0 && hidden.reason !== GALLERY_REASON) {
      this.hidden = null
    }
    this.publish()
  }

  private publish(): void {
    const hidden = this.hidden
    if (hidden === null) {
      this.retained.set('reveal.state', { hidden: false, reason: '', windows: [] })
      return
    }
    this.retained.set('reveal.state', { hidden: true, reason: hidden.reason, windows: hidden.windows })
  }
}

function releasePictures(windows: HiddenWindow[]): void {
  for (const window of windows) {
    if (window.handle !== '') {
      releasePaintable(window.handle)
    }
  }
}

function reasonOf(data: unknown): string {
  const reason = stringOf(recordOf(data).reason)
  if (reason === '') {
    return 'request'
  }
  return reason
}
