import { describe, expect, test } from 'bun:test'
import {
  columnsThatFit,
  groupThousands,
  lastWeeks,
  monthLabelsOf,
  monthSegmentsOf,
  pluralize,
  relativeTime,
  shortDate,
  weeklyTotalsOf,
} from './lib'
import type { ContributionDay } from './model'

// Whole weeks of consecutive days starting on a Sunday.
function weeksFrom(start: string, weekCount: number, count = 1): ContributionDay[][] {
  const first = Date.parse(`${start}T00:00:00Z`)
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => ({
      date: new Date(first + (week * 7 + day) * 86_400_000).toISOString().slice(0, 10),
      count,
      level: 1,
    })),
  )
}

describe('formatting', () => {
  test('groups thousands', () => {
    expect(groupThousands(0)).toBe('0')
    expect(groupThousands(999)).toBe('999')
    expect(groupThousands(1302)).toBe('1,302')
    expect(groupThousands(1234567)).toBe('1,234,567')
  })

  test('pluralizes', () => {
    expect(pluralize(1, 'day')).toBe('1 day')
    expect(pluralize(0, 'day')).toBe('0 days')
    expect(pluralize(2400, 'commit')).toBe('2,400 commits')
  })

  test('short dates', () => {
    expect(shortDate('2026-07-15')).toBe('Jul 15')
    expect(shortDate('2026-01-03T10:00:00Z')).toBe('Jan 3')
    expect(shortDate('nonsense')).toBe('nonsense')
  })

  test('relative times', () => {
    const now = Date.parse('2026-03-15T12:00:00Z')
    expect(relativeTime('2026-03-15T11:59:40Z', now)).toBe('just now')
    expect(relativeTime('2026-03-15T11:30:00Z', now)).toBe('30m ago')
    expect(relativeTime('2026-03-15T09:00:00Z', now)).toBe('3h ago')
    expect(relativeTime('2026-03-10T12:00:00Z', now)).toBe('5d ago')
    expect(relativeTime('2026-01-02T12:00:00Z', now)).toBe('Jan 2')
    expect(relativeTime(now - 120_000, now)).toBe('2m ago')
    expect(relativeTime('garbage', now)).toBe('')
  })
})

describe('the graph', () => {
  test('keeps the last whole weeks', () => {
    const days = weeksFrom('2026-01-04', 10).flat()
    const columns = lastWeeks(days, 4)
    expect(columns.length).toBe(4)
    expect(columns[3][6].date).toBe(days[days.length - 1].date)
  })

  test('a final partial week is kept as it is', () => {
    const days = [...weeksFrom('2026-01-04', 2).flat(), ...weeksFrom('2026-01-18', 1)[0].slice(0, 3)]
    const columns = lastWeeks(days, 10)
    expect(columns.length).toBe(3)
    expect(columns[2].length).toBe(3)
  })

  test('how many columns fit a width', () => {
    expect(columnsThatFit(402, 10, 3)).toBe(31)
    expect(columnsThatFit(5, 10, 3)).toBe(1)
  })

  test('weekly totals', () => {
    expect(weeklyTotalsOf(weeksFrom('2026-01-04', 3, 2))).toEqual([14, 14, 14])
  })

  test('month labels sit over the first column of a month', () => {
    // Weeks starting Jan 4 2026: February starts in the fifth column, March in the ninth.
    const columns = weeksFrom('2026-01-04', 14)
    expect(monthLabelsOf(columns)).toEqual([
      { column: 0, label: 'Jan' },
      { column: 4, label: 'Feb' },
      { column: 8, label: 'Mar' },
    ])
  })

  test('a name too close to the previous one replaces it', () => {
    // Dec 28 starts December, Jan 4 starts January one column later.
    const labels = monthLabelsOf(weeksFrom('2025-12-28', 12))
    expect(labels[0]).toEqual({ column: 1, label: 'Jan' })
  })

  test('a month starting in the last columns gets no name', () => {
    const columns = weeksFrom('2026-01-04', 10)
    for (const entry of monthLabelsOf(columns)) {
      expect(columns.length - entry.column >= 3).toBe(true)
    }
  })

  test('segments tile the whole width', () => {
    const columns = weeksFrom('2025-12-28', 20)
    const segments = monthSegmentsOf(monthLabelsOf(columns), columns.length)
    expect(segments.reduce((sum, segment) => sum + segment.columns, 0)).toBe(20)
  })
})
