// How the user's locale writes dates and times, as data a client without
// Intl can format with (clients/intl.ts). The host builds it with its own
// Intl. For every combination of fields a view asks for it records the order,
// the literals between the fields, and how each field is written there: a
// month is "11" in one Japanese pattern and "Nov" in an English one, and an
// hour is padded in French only next to minutes.

export interface LocaleProfile {
  // Keyed by patternKey().
  patterns: Record<string, PatternPart[]>
  // Weekday, month and day-period names, shared between patterns.
  nameLists: string[][]
  // What goes between a date and a time formatted together.
  joiner: string
}

export type PatternPart = string | FieldSlot

export interface FieldSlot {
  field: string
  // For weekday (by Date.getDay()), month (by getMonth()) and dayPeriod (am, pm).
  names?: number
  // For day, year, hour, minute and second.
  pad?: boolean
  // For hour: h11, h12, h23 or h24.
  cycle?: string
}

export interface FieldOptions {
  weekday?: string
  year?: string
  month?: string
  day?: string
  hour?: string
  minute?: string
  second?: string
}

export const DATE_FIELDS: (keyof FieldOptions)[] = ['weekday', 'year', 'month', 'day']
export const TIME_FIELDS: (keyof FieldOptions)[] = ['hour', 'minute', 'second']

export function patternKey(options: FieldOptions, fields: (keyof FieldOptions)[]): string {
  return fields.map((field) => `${field}=${styleOf(options[field])}`).join('|')
}

function styleOf(style: string | undefined): string {
  if (style === undefined) {
    return 'none'
  }
  return style
}

const DATE_CHOICES: Record<string, (string | undefined)[]> = {
  weekday: [undefined, 'short', 'long'],
  year: [undefined, 'numeric'],
  month: [undefined, 'numeric', '2-digit', 'short', 'long'],
  day: [undefined, 'numeric', '2-digit'],
}

const TIME_CHOICES: Record<string, (string | undefined)[]> = {
  hour: [undefined, 'numeric', '2-digit'],
  minute: [undefined, '2-digit'],
  second: [undefined, '2-digit'],
}

// 2 January 2024, 03:04:05 — a Tuesday; every field differs from the others.
const REFERENCE = new Date(2024, 0, 2, 3, 4, 5)

/** Built on the host, where Intl exists. */
export function buildLocaleProfile(locale: string | undefined): LocaleProfile {
  const builder = new ProfileBuilder(locale)
  for (const options of combinations(DATE_CHOICES)) {
    builder.addPattern(patternKey(options, DATE_FIELDS), options)
  }
  for (const options of combinations(TIME_CHOICES)) {
    builder.addPattern(patternKey(options, TIME_FIELDS), options)
  }
  return builder.profile()
}

class ProfileBuilder {
  private readonly locale: string | undefined
  private readonly patterns: Record<string, PatternPart[]> = {}
  private readonly nameLists: string[][] = []
  private readonly nameListIndex = new Map<string, number>()

  constructor(locale: string | undefined) {
    this.locale = locale
  }

  addPattern(key: string, options: FieldOptions): void {
    const format = new Intl.DateTimeFormat(this.locale, options as Intl.DateTimeFormatOptions)
    this.patterns[key] = format.formatToParts(REFERENCE).map((part) => this.partOf(format, part))
  }

  profile(): LocaleProfile {
    return { patterns: this.patterns, nameLists: this.nameLists, joiner: joinerOf(this.locale) }
  }

  private partOf(format: Intl.DateTimeFormat, part: Intl.DateTimeFormatPart): PatternPart {
    switch (part.type) {
      case 'weekday':
        return { field: 'weekday', names: this.names(valuesOf(format, 'weekday', weekdayDates())) }
      case 'month':
        return { field: 'month', names: this.names(valuesOf(format, 'month', monthDates())) }
      case 'dayPeriod':
        return { field: 'dayPeriod', names: this.names(valuesOf(format, 'dayPeriod', dayPeriodDates())) }
      case 'hour':
        return { field: 'hour', pad: padded(format, 'hour', atHour(9)), cycle: cycleOf(format) }
      case 'day':
        return { field: 'day', pad: padded(format, 'day', new Date(2024, 0, 1)) }
      case 'year':
        return { field: 'year', pad: valueOf(format, 'year', REFERENCE).length === 2 }
      case 'minute':
      case 'second':
        return { field: part.type, pad: true }
      default:
        return part.value
    }
  }

  private names(values: string[]): number {
    const key = values.join('\u0000')
    const known = this.nameListIndex.get(key)
    if (known !== undefined) {
      return known
    }
    this.nameLists.push(values)
    this.nameListIndex.set(key, this.nameLists.length - 1)
    return this.nameLists.length - 1
  }
}

function combinations(choices: Record<string, (string | undefined)[]>): FieldOptions[] {
  let results: FieldOptions[] = [{}]
  for (const [field, styles] of Object.entries(choices)) {
    results = results.flatMap((partial) => styles.map((style) => withField(partial, field, style)))
  }
  return results.filter((options) => Object.keys(options).length > 0)
}

function withField(partial: FieldOptions, field: string, style: string | undefined): FieldOptions {
  if (style === undefined) {
    return partial
  }
  return { ...partial, [field]: style }
}

function valueOf(format: Intl.DateTimeFormat, type: string, date: Date): string {
  const part = format.formatToParts(date).find((candidate) => candidate.type === type)
  if (part === undefined) {
    return ''
  }
  return part.value
}

function valuesOf(format: Intl.DateTimeFormat, type: string, dates: Date[]): string[] {
  return dates.map((date) => valueOf(format, type, date))
}

function padded(format: Intl.DateTimeFormat, type: string, date: Date): boolean {
  return valueOf(format, type, date).length === 2
}

// What hour 0 and hour 13 come out as tells the cycle apart.
function cycleOf(format: Intl.DateTimeFormat): string {
  const midnight = Number(valueOf(format, 'hour', atHour(0)))
  const afternoon = Number(valueOf(format, 'hour', atHour(13)))
  if (afternoon === 1 && midnight === 12) {
    return 'h12'
  }
  if (afternoon === 1) {
    return 'h11'
  }
  if (midnight === 24) {
    return 'h24'
  }
  return 'h23'
}

function atHour(hour: number): Date {
  return new Date(2024, 0, 2, hour, 4, 5)
}

// 7 January 2024 was a Sunday, which is day 0 to Date.getDay().
function weekdayDates(): Date[] {
  return Array.from({ length: 7 }, (_, index) => new Date(2024, 0, 7 + index, 3, 4, 5))
}

function monthDates(): Date[] {
  return Array.from({ length: 12 }, (_, index) => new Date(2024, index, 2, 3, 4, 5))
}

function dayPeriodDates(): Date[] {
  return [atHour(3), atHour(15)]
}

const DATE_PART_TYPES = new Set(['weekday', 'year', 'month', 'day'])
// A day period can come before the hour, as Korean writes it.
const TIME_PART_TYPES = new Set(['hour', 'dayPeriod'])

// What a date and a time formatted together have between them that the date
// alone does not already end with.
function joinerOf(locale: string | undefined): string {
  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const both = new Intl.DateTimeFormat(locale, { ...dateOptions, hour: 'numeric', minute: '2-digit' })
  const between = textAfterLastDateField(both.formatToParts(REFERENCE), true)
  const dateEnding = textAfterLastDateField(new Intl.DateTimeFormat(locale, dateOptions).formatToParts(REFERENCE), false)
  if (!between.startsWith(dateEnding)) {
    return between
  }
  return between.slice(dateEnding.length)
}

function textAfterLastDateField(parts: Intl.DateTimeFormatPart[], stopAtHour: boolean): string {
  let lastDateIndex = -1
  parts.forEach((part, index) => {
    if (DATE_PART_TYPES.has(part.type)) {
      lastDateIndex = index
    }
  })
  let end = parts.length
  if (stopAtHour) {
    end = parts.findIndex((part) => TIME_PART_TYPES.has(part.type))
  }
  return parts
    .slice(lastDateIndex + 1, end)
    .map((part) => part.value)
    .join('')
}
