import GLib from 'gi://GLib'
import ICalGLib from 'gi://ICalGLib?version=4.0'

// iCalendar text in, the occurrences inside a time window out. libical does
// the hard parts: RRULE expansion, and TZID resolution against the feed's own
// VTIMEZONEs or its built-in zone database.
//
// Times are milliseconds since the epoch. An all-day event runs from local
// midnight of its first day to local midnight after its last, so a view can
// treat both kinds alike when it asks what overlaps a day.
//
// Handled: RRULE, EXDATE, and RECURRENCE-ID overrides (a moved or renamed
// occurrence replaces the one its rule would have produced). Not handled:
// RDATE, which calendar apps rarely write.

export interface CalendarEvent {
  // Unique per occurrence: the UID and the occurrence's start.
  id: string
  calendarId: string
  title: string
  location: string
  allDay: boolean
  start: number
  end: number
}

export interface TimeWindow {
  start: number
  end: number
}

const DAY_MS = 86_400_000
// A rule without an end, iterated from a start years back, stops here.
const MAX_OCCURRENCES = 20_000

export function eventsIn(text: string, calendarId: string, window: TimeWindow): CalendarEvent[] {
  const calendar = ICalGLib.Component.new_from_string(text)
  if (calendar === null) {
    throw new Error('not an iCalendar feed')
  }
  const events = veventsOf(calendar)
  const overridden = overriddenOccurrences(events)
  const found: CalendarEvent[] = []
  for (const event of events) {
    found.push(...occurrencesOf(event, calendarId, window, overridden))
  }
  return found.sort((first, second) => first.start - second.start)
}

function veventsOf(calendar: ICalGLib.Component): ICalGLib.Component[] {
  if (calendar.isa() === ICalGLib.ComponentKind.VEVENT_COMPONENT) {
    return [calendar]
  }
  const events: ICalGLib.Component[] = []
  const kind = ICalGLib.ComponentKind.VEVENT_COMPONENT
  for (let event = calendar.get_first_component(kind); event !== null; event = calendar.get_next_component(kind)) {
    events.push(event)
  }
  return events
}

// "uid@start" of every occurrence some override replaces.
function overriddenOccurrences(events: ICalGLib.Component[]): Set<string> {
  const keys = new Set<string>()
  for (const event of events) {
    const recurrenceId = event.get_recurrenceid()
    if (!recurrenceId.is_null_time()) {
      keys.add(occurrenceKey(event.get_uid(), msOf(recurrenceId)))
    }
  }
  return keys
}

function occurrencesOf(
  event: ICalGLib.Component,
  calendarId: string,
  window: TimeWindow,
  overridden: Set<string>,
): CalendarEvent[] {
  const start = event.get_dtstart()
  if (start.is_null_time() || isCancelled(event)) {
    return []
  }
  const duration = durationOf(event, start)
  const rule = event.get_first_property(ICalGLib.PropertyKind.RRULE_PROPERTY)
  const isOverride = !event.get_recurrenceid().is_null_time()
  if (rule === null || isOverride) {
    return eventAt(event, calendarId, msOf(start), duration, window)
  }
  const excluded = excludedStarts(event)
  const found: CalendarEvent[] = []
  for (const occurrence of ruleStarts(rule.get_rrule(), start, window)) {
    const key = occurrenceKey(event.get_uid(), occurrence)
    if (excluded.has(occurrence) || overridden.has(key)) {
      continue
    }
    found.push(...eventAt(event, calendarId, occurrence, duration, window))
  }
  return found
}

// The rule's occurrence starts up to the window's end. Starts before the window
// are still walked: a rule's COUNT is counted from its first occurrence.
function ruleStarts(rule: ICalGLib.Recurrence, start: ICalGLib.Time, window: TimeWindow): number[] {
  const iterator = ICalGLib.RecurIterator.new(rule, start)
  const starts: number[] = []
  for (let index = 0; index < MAX_OCCURRENCES; index += 1) {
    const next = iterator.next()
    if (next === null || next.is_null_time()) {
      break
    }
    const occurrence = msOf(next)
    if (occurrence >= window.end) {
      break
    }
    starts.push(occurrence)
  }
  return starts
}

function eventAt(
  event: ICalGLib.Component,
  calendarId: string,
  start: number,
  duration: number,
  window: TimeWindow,
): CalendarEvent[] {
  const end = start + duration
  if (end <= window.start || start >= window.end) {
    return []
  }
  return [
    {
      id: occurrenceKey(event.get_uid(), start),
      calendarId,
      title: textOf(event.get_summary(), 'Untitled event'),
      location: textOf(event.get_location(), ''),
      allDay: event.get_dtstart().is_date(),
      start,
      end,
    },
  ]
}

// DTEND, or DTSTART + DURATION (libical computes that); an all-day event
// without either is one day long, a timed one a moment.
function durationOf(event: ICalGLib.Component, start: ICalGLib.Time): number {
  const end = event.get_dtend()
  if (!end.is_null_time()) {
    return Math.max(0, msOf(end) - msOf(start))
  }
  if (start.is_date()) {
    return DAY_MS
  }
  return 0
}

function excludedStarts(event: ICalGLib.Component): Set<number> {
  const excluded = new Set<number>()
  const kind = ICalGLib.PropertyKind.EXDATE_PROPERTY
  for (let property = event.get_first_property(kind); property !== null; property = event.get_next_property(kind)) {
    excluded.add(msOf(property.get_exdate()))
  }
  return excluded
}

function isCancelled(event: ICalGLib.Component): boolean {
  return event.get_status() === ICalGLib.PropertyStatus.CANCELLED
}

// A date is local midnight, a floating time local wall-clock time; anything
// with a zone, UTC included, is converted through it.
function msOf(time: ICalGLib.Time): number {
  if (time.is_date()) {
    return localMs(time, 0, 0, 0)
  }
  const zone = time.get_timezone()
  if (zone === null) {
    return localMs(time, time.get_hour(), time.get_minute(), time.get_second())
  }
  return time.as_timet_with_zone(zone) * 1000
}

function localMs(time: ICalGLib.Time, hour: number, minute: number, second: number): number {
  const local = GLib.DateTime.new_local(time.get_year(), time.get_month(), time.get_day(), hour, minute, second)
  return local.to_unix() * 1000
}

function occurrenceKey(uid: string | null, start: number): string {
  return `${textOf(uid, '')}@${start}`
}

function textOf(value: string | null, fallback: string): string {
  if (value === null || value === '') {
    return fallback
  }
  return value
}
