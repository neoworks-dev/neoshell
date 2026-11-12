import type { Plugin } from '@neoworks/extension-system'
import GLib from 'gi://GLib'
import { joinPath, makeDirectory, readTextFile, writeTextFile } from '../../gjs/fs.js'
import { thumbnailHandle } from '../../host/paintables.js'
import { RetainedTopics, registerFunction } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { pickString, sectionOf } from '../../lib/config.js'
import { numberOf, recordOf, stringListOf, stringOf } from '../../lib/record.js'
import { requireService } from '../../lib/services.js'
import { startHelper } from './helperProcess.js'
import type { HelperProcess } from './helperProcess.js'
import { historyEntryOf, historyOf, isSavedPath, withHistoryEntry } from './history.js'
import type { HistoryEntry } from './history.js'
import {
  ENDED_STATES,
  Endpoints,
  eventOf,
  initialState,
  transferOf,
  withTransfer,
  withoutTransfer,
} from './state.js'
import type { QuickShareState, Transfer } from './state.js'

// quickshare: Quick Share (Android's Nearby Share) through the rqs_lib helper
// in helpers/quickshare, built with `task quickshare`.
//
//   quickshare.state                       QuickShareState (retained)
//   quickshare.history                     {entries: HistoryEntry[]} (retained)
//   quickshare:discover                    {on}
//   quickshare:send                        {device, files}
//   quickshare:accept / reject / cancel    {id}
//   quickshare:visibility                  {value: "temporarily"} — a minute
//   quickshare:pairing                     {on} — visible for as long as it is on
//   quickshare:thumbnail                   {path, pixels} → {handle} | {error}
//   quickshare:open                        {path} → {ok} | {error}
//   quickshare:clearHistory                {}
//   quickshare:received                    {paths} when files have arrived
//
// Thumbnails and opening only take files a finished share left
// (history.ts), so a client cannot reach anything else through them.
//
// Lasting visibility is config, so receiving stays off until it is turned on
// and stays on across restarts:
//
//   "quickshare": {"visibility": "invisible" | "visible", "deviceName": "…",
//                  "downloadDir": "…", "helper": "/path/to/neoshell-quickshare",
//                  "trusted": ["Pixel 9"]}
//
// A share from a trusted device is accepted without asking. Trust goes by the
// name the sender announces, which anyone nearby can copy; Android's own
// account-based trust needs Google's certificates, which rqs_lib has no way to
// present.

const HELPER_PATH = ['helpers', 'quickshare', 'target', 'release', 'neoshell-quickshare']
const RESTART_DELAY_MS = 5000
const MAX_RESTARTS = 5
// A finished transfer stays on screen this long before it is dropped.
const ENDED_LINGER_MS = 6000
const VISIBILITIES = new Set(['visible', 'invisible'])
// "temporarily" lasts a minute; pairing asks again before it runs out.
const PAIRING_RENEW_MS = 50000
const CALL_TIMEOUT_MS = 5000
const MAX_THUMBNAIL_PIXELS = 512
const HISTORY_FILE = ['neoshell', 'quickshare-history.json']

interface HelperOptions {
  helper: string
  visibility: string
  deviceName: string
  downloadDir: string
  trusted: string[]
}

const quickShareExtension: Plugin.Object = {
  name: 'quickshare',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const topics = new RetainedTopics(bus)
    const quickShare = new QuickShare(bus, topics)
    context.effect(() => () => {
      quickShare.stop()
      topics.withdrawAll()
    })
    context.effect(() =>
      bus.subscribe('config', (message) => {
        quickShare.configure(message.data)
      }),
    )
    registerFunction(context, bus, 'quickshare:discover', (data) => quickShare.discover(recordOf(data).on === true))
    registerFunction(context, bus, 'quickshare:send', (data) => quickShare.send(data))
    registerFunction(context, bus, 'quickshare:visibility', (data) =>
      quickShare.command({ cmd: 'visibility', value: stringOf(recordOf(data).value) }),
    )
    registerFunction(context, bus, 'quickshare:pairing', (data) => quickShare.pairing(recordOf(data).on === true))
    registerFunction(context, bus, 'quickshare:thumbnail', (data) => quickShare.thumbnail(data))
    registerFunction(context, bus, 'quickshare:open', (data) => quickShare.open(data))
    registerFunction(context, bus, 'quickshare:clearHistory', () => quickShare.clearHistory())
    for (const verb of ['accept', 'reject', 'cancel']) {
      registerFunction(context, bus, `quickshare:${verb}`, (data) =>
        quickShare.command({ cmd: verb, id: stringOf(recordOf(data).id) }),
      )
    }
  },
}

export default quickShareExtension

class QuickShare {
  private readonly bus: BusService
  private readonly topics: RetainedTopics
  private readonly endpoints = new Endpoints()
  private state: QuickShareState = initialState()
  private helper: HelperProcess | null = null
  private options: HelperOptions | null = null
  private restarts = 0
  private restartTimer: ReturnType<typeof setTimeout> | null = null
  private pairingTimer: ReturnType<typeof setInterval> | null = null
  private stopped = false
  private history: HistoryEntry[] = loadHistory()

  constructor(bus: BusService, topics: RetainedTopics) {
    this.bus = bus
    this.topics = topics
    this.publish()
    this.publishHistory()
  }

  // A device pairs by sharing to this one, which has to be visible for that.
  // Lasting visibility is left alone; otherwise it is kept on "temporarily"
  // while pairing, and put back once it ends.
  pairing(on: boolean): Record<string, unknown> {
    this.stopPairing()
    if (this.keepsVisible()) {
      return { ok: true }
    }
    if (!on) {
      return this.command({ cmd: 'visibility', value: 'invisible' })
    }
    this.pairingTimer = setInterval(() => this.command({ cmd: 'visibility', value: 'temporarily' }), PAIRING_RENEW_MS)
    return this.command({ cmd: 'visibility', value: 'temporarily' })
  }

  thumbnail(data: unknown): Record<string, unknown> {
    const request = recordOf(data)
    const path = stringOf(request.path)
    if (!isSavedPath(this.history, path)) {
      return { error: 'not a received file' }
    }
    const pixels = Math.min(numberOf(request.pixels, 128), MAX_THUMBNAIL_PIXELS)
    const handle = thumbnailHandle(path, pixels)
    if (handle === '') {
      return { error: 'not a picture' }
    }
    return { handle }
  }

  async open(data: unknown): Promise<unknown> {
    const path = stringOf(recordOf(data).path)
    if (!isSavedPath(this.history, path)) {
      return { error: 'not a received file' }
    }
    return this.bus.call('files:open', { path }, CALL_TIMEOUT_MS)
  }

  clearHistory(): Record<string, unknown> {
    this.history = []
    saveHistory(this.history)
    this.publishHistory()
    return { ok: true }
  }

  // The helper starts with the first config snapshot. Later edits are sent to
  // the running helper; only a different helper binary restarts it.
  configure(snapshot: unknown): void {
    const next = optionsOf(sectionOf(snapshot, 'quickshare'))
    const previous = this.options
    this.options = next
    if (previous === null || previous.helper !== next.helper) {
      this.restart()
      return
    }
    this.applyChanges(previous, next)
  }

  command(command: Record<string, unknown>): Record<string, unknown> {
    if (this.helper === null) {
      return { error: 'Quick Share is not running' }
    }
    this.helper.send(command)
    return { ok: true }
  }

  discover(on: boolean): Record<string, unknown> {
    const reply = this.command({ cmd: 'discover', on })
    if (reply.error === undefined) {
      this.state = { ...this.state, discovering: on }
      this.publish()
    }
    return reply
  }

  send(data: unknown): Record<string, unknown> {
    const request = recordOf(data)
    const files = stringListOf(request.files)
    if (files.length === 0) {
      return { error: 'Nothing to send' }
    }
    return this.command({ cmd: 'send', endpoint: stringOf(request.device), files })
  }

  stop(): void {
    this.stopped = true
    this.stopPairing()
    this.cancelRestart()
    if (this.helper !== null) {
      this.helper.stop()
      this.helper = null
    }
  }

  private stopPairing(): void {
    if (this.pairingTimer === null) {
      return
    }
    clearInterval(this.pairingTimer)
    this.pairingTimer = null
  }

  private keepsVisible(): boolean {
    return this.options !== null && this.options.visibility === 'visible'
  }

  private recordFinished(transfer: Transfer): void {
    this.history = withHistoryEntry(this.history, historyEntryOf(transfer, Date.now()))
    saveHistory(this.history)
    this.publishHistory()
  }

  private publishHistory(): void {
    this.topics.set('quickshare.history', { entries: this.history })
  }

  private applyChanges(previous: HelperOptions, next: HelperOptions): void {
    if (next.visibility !== previous.visibility) {
      this.command({ cmd: 'visibility', value: next.visibility })
    }
    if (next.deviceName !== previous.deviceName && next.deviceName !== '') {
      this.command({ cmd: 'deviceName', name: next.deviceName })
    }
    if (next.downloadDir !== previous.downloadDir && next.downloadDir !== '') {
      this.command({ cmd: 'downloadDir', path: next.downloadDir })
    }
  }

  private restart(): void {
    this.cancelRestart()
    if (this.helper !== null) {
      this.helper.stop()
      this.helper = null
    }
    if (this.options === null || this.stopped) {
      return
    }
    this.launch(this.options)
  }

  private launch(options: HelperOptions): void {
    if (!GLib.file_test(options.helper, GLib.FileTest.IS_EXECUTABLE)) {
      this.setUnavailable('The Quick Share helper is not built. Run `task quickshare` in neoshell.')
      return
    }
    this.helper = startHelper(
      argvOf(options),
      (line) => this.handleLine(line),
      () => this.helperExited(),
    )
    if (this.helper === null) {
      this.setUnavailable('The Quick Share helper could not be started.')
    }
  }

  private helperExited(): void {
    this.helper = null
    this.endpoints.clear()
    this.setUnavailable('The Quick Share helper stopped.')
    if (this.stopped || this.restarts >= MAX_RESTARTS) {
      return
    }
    this.restarts += 1
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      this.restart()
    }, RESTART_DELAY_MS)
  }

  private cancelRestart(): void {
    if (this.restartTimer === null) {
      return
    }
    clearTimeout(this.restartTimer)
    this.restartTimer = null
  }

  private setUnavailable(reason: string): void {
    this.state = { ...initialState(), reason }
    this.publish()
  }

  private handleLine(line: string): void {
    const event = eventOf(line)
    if (event === null) {
      return
    }
    this.apply(stringOf(event.event), event)
    this.publish()
  }

  private apply(kind: string, event: Record<string, unknown>): void {
    switch (kind) {
      case 'ready':
        this.restarts = 0
        this.state = { ...this.state, available: true, reason: '' }
        return
      case 'visibility':
        this.state = { ...this.state, visibility: stringOf(event.value) }
        return
      case 'endpoint':
        this.applyEndpoint(event)
        return
      case 'transfer':
        this.applyTransfer(transferOf(event))
        return
      case 'error':
        console.error(`quickshare: ${stringOf(event.message)}`)
        return
    }
  }

  // Endpoints only arrive while discovering; stopping it reports them gone.
  private applyEndpoint(event: Record<string, unknown>): void {
    this.endpoints.apply(event)
    this.state = { ...this.state, devices: this.endpoints.devices() }
  }

  private applyTransfer(transfer: Transfer): void {
    if (this.acceptsTrusted(transfer)) {
      return
    }
    this.state = { ...this.state, transfers: withTransfer(this.state.transfers, transfer) }
    if (!ENDED_STATES.has(transfer.state)) {
      return
    }
    if (transfer.state === 'finished') {
      this.recordFinished(transfer)
    }
    if (transfer.direction === 'incoming' && transfer.state === 'finished' && transfer.savedPaths.length > 0) {
      this.bus.publish('quickshare:received', { paths: transfer.savedPaths })
    }
    setTimeout(() => this.dropTransfer(transfer.id), ENDED_LINGER_MS)
  }

  // The request never reaches the screen: it is answered here, and the
  // transfer shows up again once it is receiving.
  private acceptsTrusted(transfer: Transfer): boolean {
    const trusted = this.options !== null && this.options.trusted.includes(transfer.peer)
    if (!trusted || transfer.direction !== 'incoming' || transfer.state !== 'waitingForUserConsent') {
      return false
    }
    this.command({ cmd: 'accept', id: transfer.id })
    return true
  }

  private dropTransfer(id: string): void {
    this.state = { ...this.state, transfers: withoutTransfer(this.state.transfers, id) }
    this.publish()
  }

  private publish(): void {
    this.topics.set('quickshare.state', this.state)
  }
}

function historyPath(): string {
  return joinPath(GLib.get_user_state_dir(), ...HISTORY_FILE)
}

function loadHistory(): HistoryEntry[] {
  const text = readTextFile(historyPath())
  if (text === null) {
    return []
  }
  try {
    return historyOf(JSON.parse(text))
  } catch {
    console.error(`quickshare: unreadable history in ${historyPath()}`)
    return []
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  makeDirectory(GLib.path_get_dirname(historyPath()))
  writeTextFile(historyPath(), JSON.stringify(entries, null, 2))
}

function optionsOf(section: Record<string, unknown>): HelperOptions {
  return {
    helper: helperPathOf(pickString(section, 'helper')),
    visibility: visibilityOf(stringOf(section.visibility)),
    deviceName: stringOf(section.deviceName),
    downloadDir: stringOf(section.downloadDir),
    trusted: stringListOf(section.trusted),
  }
}

function helperPathOf(configured: string | undefined): string {
  if (configured !== undefined) {
    return configured
  }
  return GLib.build_filenamev([GLib.get_current_dir(), ...HELPER_PATH])
}

function visibilityOf(value: string): string {
  if (VISIBILITIES.has(value)) {
    return value
  }
  return 'invisible'
}

function argvOf(options: HelperOptions): string[] {
  const argv = [options.helper, '--visibility', options.visibility]
  if (options.deviceName !== '') {
    argv.push('--device-name', options.deviceName)
  }
  if (options.downloadDir !== '') {
    argv.push('--download-dir', options.downloadDir)
  }
  return argv
}
