import { DATE_FIELDS, patternKey, TIME_FIELDS } from '../lib/localeProfile.js'
import type { FieldOptions, FieldSlot, LocaleProfile, PatternPart } from '../lib/localeProfile.js'

// QuickJS has no Intl. Views format dates with Intl.DateTimeFormat, so a
// client gets one that fills in the host's locale profile, which arrives
// before any view mounts. It covers the fields views use: weekday, year,
// month, day, hour, minute and second, in their common styles.

let profile: LocaleProfile | null = null

export function setLocaleProfile(next: LocaleProfile): void {
  profile = next
}

class DateTimeFormat {
  private readonly options: FieldOptions

  constructor(_locale?: unknown, options: Record<string, unknown> = {}) {
    this.options = fieldsOf(options)
  }

  format(date: Date | number = new Date()): string {
    const moment = new Date(date)
    if (profile === null) {
      return moment.toString()
    }
    return formatWith(profile, this.options, moment)
  }
}

export function installDateTimeFormat(): void {
  const globals = globalThis as Record<string, unknown>
  if (globals.Intl !== undefined) {
    return
  }
  globals.Intl = { DateTimeFormat }
}

const FIELD_NAMES: (keyof FieldOptions)[] = [...DATE_FIELDS, ...TIME_FIELDS]

// With no field asked for, Intl writes the numeric date.
function fieldsOf(options: Record<string, unknown>): FieldOptions {
  const fields: FieldOptions = {}
  for (const name of FIELD_NAMES) {
    if (typeof options[name] === 'string') {
      fields[name] = options[name] as string
    }
  }
  if (Object.keys(fields).length === 0) {
    return { year: 'numeric', month: 'numeric', day: 'numeric' }
  }
  return fields
}

function formatWith(locale: LocaleProfile, options: FieldOptions, moment: Date): string {
  const date = filled(locale, locale.patterns[patternKey(options, DATE_FIELDS)], moment)
  const time = filled(locale, locale.patterns[patternKey(options, TIME_FIELDS)], moment)
  if (date === '' || time === '') {
    return date + time
  }
  return `${date}${locale.joiner}${time}`
}

function filled(locale: LocaleProfile, pattern: PatternPart[] | undefined, moment: Date): string {
  if (pattern === undefined) {
    return ''
  }
  return pattern
    .map((part) => {
      if (typeof part === 'string') {
        return part
      }
      return slotText(locale, part, moment)
    })
    .join('')
}

function slotText(locale: LocaleProfile, slot: FieldSlot, moment: Date): string {
  switch (slot.field) {
    case 'weekday':
      return nameOf(locale, slot, moment.getDay())
    case 'month':
      return nameOf(locale, slot, moment.getMonth())
    case 'dayPeriod':
      return nameOf(locale, slot, afternoonIndex(moment.getHours()))
    case 'day':
      return numberText(moment.getDate(), slot)
    case 'year':
      return yearText(moment.getFullYear(), slot)
    case 'hour':
      return numberText(hourOf(slot.cycle, moment.getHours()), slot)
    case 'minute':
      return numberText(moment.getMinutes(), slot)
    case 'second':
      return numberText(moment.getSeconds(), slot)
    default:
      return ''
  }
}

function nameOf(locale: LocaleProfile, slot: FieldSlot, index: number): string {
  if (slot.names === undefined) {
    return ''
  }
  const names = locale.nameLists[slot.names]
  if (names === undefined) {
    return ''
  }
  return names[index]
}

function afternoonIndex(hours: number): number {
  if (hours < 12) {
    return 0
  }
  return 1
}

function yearText(year: number, slot: FieldSlot): string {
  if (slot.pad === true) {
    return pad(year % 100)
  }
  return String(year)
}

// h12 runs 12, 1 … 11; h11 0 … 11; h24 1 … 24; h23 0 … 23.
function hourOf(cycle: string | undefined, hours: number): number {
  if (cycle === 'h11') {
    return hours % 12
  }
  if (cycle === 'h12') {
    return wrapZero(hours % 12, 12)
  }
  if (cycle === 'h24') {
    return wrapZero(hours, 24)
  }
  return hours
}

function wrapZero(hour: number, top: number): number {
  if (hour === 0) {
    return top
  }
  return hour
}

function numberText(value: number, slot: FieldSlot): string {
  if (slot.pad === true) {
    return pad(value)
  }
  return String(value)
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
