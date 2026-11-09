import type { Plugin } from '@neoworks/extension-system'
import GLib from 'gi://GLib'
import { RetainedTopics } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { requireService } from '../../lib/services.js'
import { watchLines } from '../../gjs/proc.js'
import { USB_ROOT, readUsbDevices } from './sysfs.js'

// usb: the connected USB devices, hubs left out.
//
//   usb.devices   {devices: [{id, name, vendor, vendorId, productId, serial,
//                             speed, power, deviceClass}]}
//
// Re-read whenever udev reports a usb event, after a short debounce. Without
// udevadm, or once its monitor ends, a 5s poll takes over.

const DEBOUNCE_MS = 300
const FALLBACK_POLL_MS = 5000

const usbExtension: Plugin.Object = {
  name: 'usb',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const topics = new RetainedTopics(bus)
    const watcher = new UsbWatcher(topics)
    context.effect(() => {
      watcher.start()
      return () => {
        watcher.stop()
        topics.withdrawAll()
      }
    })
  },
}

export default usbExtension

class UsbWatcher {
  private readonly topics: RetainedTopics
  private published = ''
  private stopMonitor: (() => void) | null = null
  private debounceHandle: ReturnType<typeof setTimeout> | null = null
  private pollHandle: ReturnType<typeof setInterval> | null = null

  constructor(topics: RetainedTopics) {
    this.topics = topics
  }

  start(): void {
    this.refresh()
    if (GLib.find_program_in_path('udevadm') === null) {
      this.startPolling()
      return
    }
    this.stopMonitor = watchLines(
      ['udevadm', 'monitor', '--udev', '--subsystem-match=usb'],
      (line) => this.handleLine(line),
      () => this.startPolling(),
    )
  }

  stop(): void {
    if (this.stopMonitor !== null) {
      this.stopMonitor()
      this.stopMonitor = null
    }
    if (this.debounceHandle !== null) {
      clearTimeout(this.debounceHandle)
      this.debounceHandle = null
    }
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle)
      this.pollHandle = null
    }
  }

  // Monitor lines are "UDEV  [time] add|remove|change <devpath> (usb)".
  private handleLine(line: string): void {
    if (!line.startsWith('UDEV  [')) {
      return
    }
    if (this.debounceHandle !== null) {
      clearTimeout(this.debounceHandle)
    }
    this.debounceHandle = setTimeout(() => {
      this.debounceHandle = null
      this.refresh()
    }, DEBOUNCE_MS)
  }

  private startPolling(): void {
    if (this.pollHandle !== null) {
      return
    }
    this.pollHandle = setInterval(() => this.refresh(), FALLBACK_POLL_MS)
  }

  private refresh(): void {
    const devices = readUsbDevices(USB_ROOT)
    const signature = JSON.stringify(devices)
    if (signature === this.published) {
      return
    }
    this.published = signature
    this.topics.set('usb.devices', { devices })
  }
}
