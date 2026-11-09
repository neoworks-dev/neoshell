import { recordOf } from '../../lib/record.js'
import type { ContributionDay, ContributionsState, IssuesState, ReposState } from './model.js'

// What the cards do with the backend's messages and with dates. Formatting is
// spelled out here rather than through Intl: the card runner is QuickJS.

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The topics are the backend's own, so a message is checked only for being
// one of its states.
function stateOf<State extends { status: string }>(data: unknown): State | null {
  if (typeof recordOf(data).status !== 'string') {
    return null
  }
  return data as State
}

export function contributionsOf(data: unknown): ContributionsState | null {
  return stateOf<ContributionsState>(data)
}

export function reposOf(data: unknown): ReposState | null {
  return stateOf<ReposState>(data)
}

export function issuesOf(data: unknown): IssuesState | null {
  return stateOf<IssuesState>(data)
}

/** 1302 as "1,302". */
export function groupThousands(value: number): string {
  const digits = String(Math.round(value))
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** "Mar 4" from an ISO date or timestamp. */
export function shortDate(iso: string): string {
  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  if (!(month >= 1 && month <= 12) || !(day >= 1)) {
    return iso
  }
  return `${MONTHS[month - 1]} ${day}`
}

/** "3m ago", "2h ago", "5d ago", then the date. `then` is an ISO string or epoch milliseconds. */
export function relativeTime(then: string | number, now: number): string {
  const moment = new Date(then)
  const elapsed = now - moment.getTime()
  if (Number.isNaN(elapsed)) {
    return ''
  }
  if (elapsed < MINUTE_MS) {
    return 'just now'
  }
  if (elapsed < HOUR_MS) {
    return `${Math.floor(elapsed / MINUTE_MS)}m ago`
  }
  if (elapsed < DAY_MS) {
    return `${Math.floor(elapsed / HOUR_MS)}h ago`
  }
  if (elapsed < 30 * DAY_MS) {
    return `${Math.floor(elapsed / DAY_MS)}d ago`
  }
  return shortDate(moment.toISOString())
}

export function pluralize(count: number, singular: string): string {
  if (count === 1) {
    return `${count} ${singular}`
  }
  return `${groupThousands(count)} ${singular}s`
}

/** The last `weeks` whole weeks (columns of seven days) of a calendar. */
export function lastWeeks(days: ContributionDay[], weeks: number): ContributionDay[][] {
  const columns: ContributionDay[][] = []
  for (let start = 0; start < days.length; start += 7) {
    columns.push(days.slice(start, start + 7))
  }
  return columns.slice(-weeks)
}

export interface MonthLabel {
  column: number
  label: string
}

const MIN_LABEL_SPACING = 3

/**
 * The month name over the first column that starts a new month. A name needs
 * MIN_LABEL_SPACING columns to itself: a name that would sit closer than that
 * to the graph's end is left out, and one closer to the last name replaces it,
 * so a graph starting in the last week of a month is labelled from the next.
 */
export function monthLabelsOf(columns: ContributionDay[][]): MonthLabel[] {
  const labels: MonthLabel[] = []
  let lastMonth = ''
  columns.forEach((column, index) => {
    const month = column[0].date.slice(5, 7)
    if (month === lastMonth) {
      return
    }
    lastMonth = month
    const previous = labels[labels.length - 1]
    if (columns.length - index < MIN_LABEL_SPACING) {
      return
    }
    if (previous !== undefined && index - previous.column < MIN_LABEL_SPACING) {
      labels.pop()
    }
    labels.push({ column: index, label: MONTHS[Number(month) - 1] })
  })
  return labels
}

export interface MonthSegment {
  label: string
  columns: number
}

/**
 * Month labels as consecutive segments that together span every column, each
 * as wide as its month shows; the first also covers any columns before its
 * own.
 */
export function monthSegmentsOf(labels: MonthLabel[], columnCount: number): MonthSegment[] {
  return labels.map((entry, index) => {
    let start = entry.column
    if (index === 0) {
      start = 0
    }
    let end = columnCount
    if (index + 1 < labels.length) {
      end = labels[index + 1].column
    }
    return { label: entry.label, columns: end - start }
  })
}

/** Contributions per week column. */
export function weeklyTotalsOf(columns: ContributionDay[][]): number[] {
  return columns.map((column) => column.reduce((sum, day) => sum + day.count, 0))
}

/** How many week columns fit `width` pixels at this cell size and gap. */
export function columnsThatFit(width: number, cellSize: number, gap: number): number {
  return Math.max(1, Math.floor((width + gap) / (cellSize + gap)))
}

/** The part of a full repository name after the owner. */
export function repoNameOf(fullName: string): string {
  return fullName.split('/').slice(1).join('/')
}

export function repoOwnerOf(fullName: string): string {
  return fullName.split('/')[0]
}

/** What a notification's reason reads as in a row. */
export function reasonLabelOf(reason: string): string {
  return reason.replace(/_/g, ' ')
}
