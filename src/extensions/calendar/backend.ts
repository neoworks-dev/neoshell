import type { Plugin } from '@neoworks/extension-system'
import GLib from 'gi://GLib'
import { RetainedTopics, registerFunction } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { sectionOf } from '../../lib/config.js'
import { startPolling } from '../../lib/poll.js'
import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record.js'
import { requireService } from '../../lib/services.js'
import { getText } from '../../gjs/http.js'
import { eventsIn } from './ics.js'
import type { CalendarEvent, TimeWindow } from './ics.js'
import { clearFeedUrl, lookupFeedUrl, storeFeedUrl } from './keyring.js'

// calendar: the events of the user's iCalendar feeds as retained bus topics.
//
//   calendar:add       {name, url} → {id} | {error}
//   calendar:remove    {id} → {ok}
//   calendar:refresh   {} → {ok}
//   calendar.events    {events: CalendarEvent[], updatedAt}
//   calendar.sources   {sources: [{id, name, status, message, eventCount}]}
//
// Config names the calendars; their URLs are in the keyring (keyring.ts):
//
//   "calendar": {"sources": [{"id": "cal-1a2b", "name": "Work"}], "pollMinutes": 15}
//
// Events cover a week back to two months ahead, which is more than the notch
// shows and cheap enough to hold.

export interface SourceStatus {
  id: string
  name: string
  // ok | error | missing (no URL in the keyring)
  status: string
  message: string
  eventCount: number
}

interface Source {
  id: string
  name: string
}

interface FetchedSource {
  status: SourceStatus
  events: CalendarEvent[]
}

const DAY_MS = 86_400_000
const DAYS_BACK = 7
const DAYS_AHEAD = 60
const DEFAULT_POLL_MINUTES = 15
const CONFIG_TIMEOUT_MS = 5000
const SOURCES_KEY = 'calendar.sources'

const calendarExtension: Plugin.Object = {
  name: 'calendar',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const topics = new RetainedTopics(bus)
    context.effect(() => () => topics.withdrawAll())
    const calendars = new Calendars(bus, topics)
    context.effect(() =>
      bus.subscribe('config', (message) => {
        calendars.configure(message.data)
      }),
    )
    registerFunction(context, bus, 'calendar:add', (data) => calendars.add(data))
    registerFunction(context, bus, 'calendar:remove', (data) => calendars.remove(data))
    registerFunction(context, bus, 'calendar:refresh', () => calendars.refreshNow())
    startPolling(context, calendars.pollIntervalMs(), () => calendars.refresh())
  },
}

export default calendarExtension

class Calendars {
  private readonly bus: BusService
  private readonly topics: RetainedTopics
  private sources: Source[] = []
  private sourcesSignature = ''
  private pollMinutes = DEFAULT_POLL_MINUTES

  constructor(bus: BusService, topics: RetainedTopics) {
    this.bus = bus
    this.topics = topics
  }

  pollIntervalMs(): number {
    return this.pollMinutes * 60_000
  }

  // Config republishes on every edit anywhere; only a change to the list of
  // calendars is worth fetching again for.
  configure(snapshot: unknown): void {
    const section = sectionOf(snapshot, 'calendar')
    this.pollMinutes = Math.max(1, numberOf(section.pollMinutes, DEFAULT_POLL_MINUTES))
    const sources = sourcesOf(section.sources)
    const signature = JSON.stringify(sources)
    if (signature === this.sourcesSignature) {
      return
    }
    this.sources = sources
    this.sourcesSignature = signature
    void this.refresh()
  }

  async refreshNow(): Promise<Record<string, unknown>> {
    await this.refresh()
    return { ok: true }
  }

  async refresh(): Promise<void> {
    const window = currentWindow()
    const fetched = await Promise.all(this.sources.map((source) => fetchSource(source, window)))
    const events = fetched.flatMap((entry) => entry.events).sort((first, second) => first.start - second.start)
    this.topics.set('calendar.sources', { sources: fetched.map((entry) => entry.status) })
    this.topics.set('calendar.events', { events, updatedAt: Date.now() })
  }

  // A feed is fetched and parsed before anything is stored, so a mistyped URL
  // is refused with the reason instead of becoming a calendar that never loads.
  async add(data: unknown): Promise<Record<string, unknown>> {
    const request = recordOf(data)
    const name = stringOf(request.name).trim()
    const url = feedUrlOf(stringOf(request.url).trim())
    if (url === '') {
      return { error: 'Enter the calendar’s iCal address (https:// or webcal://).' }
    }
    try {
      eventsIn(await getText(url), 'probe', currentWindow())
    } catch (error) {
      return { error: `That address did not give a calendar: ${String(error)}` }
    }
    const id = `cal-${String(GLib.uuid_string_random()).slice(0, 8)}`
    const source = { id, name: nameOr(name, url) }
    await storeFeedUrl(id, source.name, url)
    await this.writeSources([...this.sources, source])
    return { id }
  }

  async remove(data: unknown): Promise<Record<string, unknown>> {
    const id = stringOf(recordOf(data).id)
    await clearFeedUrl(id)
    await this.writeSources(this.sources.filter((source) => source.id !== id))
    return { ok: true }
  }

  private async writeSources(sources: Source[]): Promise<void> {
    await this.bus.call('config:set', { key: SOURCES_KEY, value: sources }, CONFIG_TIMEOUT_MS)
  }
}

async function fetchSource(source: Source, window: TimeWindow): Promise<FetchedSource> {
  const url = await lookupFeedUrl(source.id).catch(() => null)
  if (url === null) {
    return failed(source, 'missing', 'The address is not in the keyring; add the calendar again.')
  }
  try {
    const events = eventsIn(await getText(url), source.id, window)
    return { status: statusOf(source, 'ok', '', events.length), events }
  } catch (error) {
    console.error(`calendar: ${source.name} failed:`, error)
    return failed(source, 'error', String(error))
  }
}

function failed(source: Source, status: string, message: string): FetchedSource {
  return { status: statusOf(source, status, message, 0), events: [] }
}

function statusOf(source: Source, status: string, message: string, eventCount: number): SourceStatus {
  return { id: source.id, name: source.name, status, message, eventCount }
}

function currentWindow(): TimeWindow {
  const today = GLib.DateTime.new_now_local()
  const midnight = GLib.DateTime.new_local(today.get_year(), today.get_month(), today.get_day_of_month(), 0, 0, 0)
  const start = midnight.to_unix() * 1000
  return { start: start - DAYS_BACK * DAY_MS, end: start + DAYS_AHEAD * DAY_MS }
}

// webcal:// is how calendar sites link a feed for subscribing; it is https.
function feedUrlOf(url: string): string {
  if (url.startsWith('webcal://')) {
    return `https://${url.slice('webcal://'.length)}`
  }
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url
  }
  return ''
}

function nameOr(name: string, url: string): string {
  if (name !== '') {
    return name
  }
  const parsed = GLib.Uri.parse(url, GLib.UriFlags.NONE)
  if (parsed === null) {
    return 'Calendar'
  }
  const host = parsed.get_host()
  if (host === null) {
    return 'Calendar'
  }
  return host
}

function sourcesOf(value: unknown): Source[] {
  const sources: Source[] = []
  for (const entry of arrayOf(value)) {
    const id = stringOf(entry.id)
    if (id !== '') {
      sources.push({ id, name: stringOf(entry.name) })
    }
  }
  return sources
}
