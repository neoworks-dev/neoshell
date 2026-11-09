import { describe, expect, test } from 'bun:test'
import {
  bestDayOf,
  classifyFailure,
  currentStreakOf,
  dailyCountsOf,
  longestStreakOf,
  mergeIssues,
  parseContributions,
  parseNotifications,
  parseRepo,
  parseSearchItems,
  repoOfUrl,
} from './model'
import type { ContributionDay } from './model'

function daysOf(counts: number[]): ContributionDay[] {
  return counts.map((count, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, '0')}`,
    count,
    level: Math.min(count, 4),
  }))
}

describe('streaks', () => {
  test('current streak counts back from the last active day', () => {
    expect(currentStreakOf(daysOf([0, 2, 1, 3]))).toBe(3)
  })

  test('an empty today does not end the streak', () => {
    expect(currentStreakOf(daysOf([1, 1, 1, 0]))).toBe(3)
  })

  test('two empty days end it', () => {
    expect(currentStreakOf(daysOf([1, 1, 0, 0]))).toBe(0)
  })

  test('no days is no streak', () => {
    expect(currentStreakOf([])).toBe(0)
    expect(longestStreakOf([])).toBe(0)
  })

  test('longest streak is the longest run anywhere', () => {
    expect(longestStreakOf(daysOf([1, 1, 0, 1, 1, 1, 0, 1]))).toBe(3)
  })

  test('best day is the highest count, first on a tie', () => {
    expect(bestDayOf(daysOf([1, 4, 4, 2]))).toEqual({ date: '2026-01-02', count: 4 })
    expect(bestDayOf(daysOf([0, 0]))).toBeNull()
  })
})

describe('parseContributions', () => {
  const payload = {
    data: {
      user: {
        login: 'octocat',
        contributionsCollection: {
          contributionCalendar: {
            totalContributions: 7,
            weeks: [
              {
                contributionDays: [
                  { date: '2026-01-01', contributionCount: 0, contributionLevel: 'NONE' },
                  { date: '2026-01-02', contributionCount: 3, contributionLevel: 'SECOND_QUARTILE' },
                ],
              },
              { contributionDays: [{ date: '2026-01-03', contributionCount: 4, contributionLevel: 'FOURTH_QUARTILE' }] },
            ],
          },
        },
      },
    },
  }

  test('flattens the weeks and derives the stats', () => {
    const state = parseContributions(payload, 5)
    expect(state?.login).toBe('octocat')
    expect(state?.days.map((day) => day.level)).toEqual([0, 2, 4])
    expect(state?.total).toBe(7)
    expect(state?.currentStreak).toBe(2)
    expect(state?.activeDays).toBe(2)
    expect(state?.bestDay).toEqual({ date: '2026-01-03', count: 4 })
  })

  test('reads the signed-in account from viewer', () => {
    const viewer = { data: { viewer: payload.data.user } }
    expect(parseContributions(viewer, 5)?.login).toBe('octocat')
  })

  test('a reply without a calendar is null', () => {
    expect(parseContributions({ data: { user: null } }, 5)).toBeNull()
    expect(parseContributions('nope', 5)).toBeNull()
  })
})

describe('classifyFailure', () => {
  test('a missing binary', () => {
    expect(classifyFailure('gh unavailable').status).toBe('missing')
  })

  test('not signed in', () => {
    const failure = classifyFailure('To get started with GitHub CLI, please run:  gh auth login')
    expect(failure.status).toBe('unauthenticated')
    expect(classifyFailure('gh: Bad credentials (HTTP 401)').status).toBe('unauthenticated')
  })

  test('anything else reports its first line', () => {
    expect(classifyFailure('gh: Not Found (HTTP 404)\nmore').message).toBe('gh: Not Found (HTTP 404)')
    expect(classifyFailure('').status).toBe('error')
  })
})

describe('repositories', () => {
  const now = Date.parse('2026-03-15T12:00:00Z')
  const commit = (sha: string, date: string, message: string): Record<string, unknown> => ({
    sha: `${sha}0000000`,
    commit: { message, author: { name: 'Ada', date } },
    author: { login: 'ada' },
  })

  test('daily counts bucket commits by whole days ending today', () => {
    const commits = [
      { sha: 'a', message: '', author: '', date: '2026-03-15T01:00:00Z' },
      { sha: 'b', message: '', author: '', date: '2026-03-15T09:00:00Z' },
      { sha: 'c', message: '', author: '', date: '2026-03-14T23:00:00Z' },
      { sha: 'd', message: '', author: '', date: '2026-03-01T00:00:00Z' },
      { sha: 'e', message: '', author: '', date: '2026-01-01T00:00:00Z' },
    ]
    const counts = dailyCountsOf(commits, now, 14)
    expect(counts.length).toBe(14)
    expect(counts[13]).toBe(2)
    expect(counts[12]).toBe(1)
    expect(counts[0]).toBe(0)
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(3)
  })

  test('parses stats, trims messages to the subject line', () => {
    const repo = parseRepo(
      { full_name: 'a/b', description: null, stargazers_count: 12, forks_count: 3, open_issues_count: 2 },
      [commit('abc', '2026-03-14T10:00:00Z', 'Fix it\n\nlong body'), commit('def', '2026-03-10T10:00:00Z', 'Older')],
      now,
    )
    expect(repo?.fullName).toBe('a/b')
    expect(repo?.description).toBe('')
    expect(repo?.stars).toBe(12)
    expect(repo?.commits[0]).toEqual({
      sha: 'abc0000',
      message: 'Fix it',
      author: 'ada',
      date: '2026-03-14T10:00:00Z',
    })
    expect(repo?.weekCommits).toBe(2)
  })

  test('a reply without a name is null', () => {
    expect(parseRepo({}, [], now)).toBeNull()
  })

  test('an empty history is empty, not an error', () => {
    expect(parseRepo({ full_name: 'a/b' }, { message: 'Git Repository is empty.' }, now)?.commits).toEqual([])
  })
})

describe('issues and notifications', () => {
  const searchReply = {
    items: [
      {
        html_url: 'https://github.com/a/b/issues/1',
        repository_url: 'https://api.github.com/repos/a/b',
        number: 1,
        title: 'First',
        comments: 2,
        updated_at: '2026-03-01T00:00:00Z',
      },
      {
        html_url: 'https://github.com/a/b/pull/2',
        repository_url: 'https://api.github.com/repos/a/b',
        number: 2,
        title: 'Second',
        pull_request: {},
        updated_at: '2026-03-02T00:00:00Z',
      },
    ],
  }

  test('repoOfUrl takes the last two segments', () => {
    expect(repoOfUrl('https://api.github.com/repos/neoworks/shell')).toBe('neoworks/shell')
  })

  test('search items know whether they are pull requests', () => {
    const items = parseSearchItems(searchReply, 'assigned')
    expect(items.map((item) => item.isPullRequest)).toEqual([false, true])
    expect(items[0].repo).toBe('a/b')
  })

  test('merging dedupes by url, joins roles, newest first', () => {
    const merged = mergeIssues([
      parseSearchItems(searchReply, 'assigned'),
      parseSearchItems(searchReply, 'authored').slice(0, 1),
    ])
    expect(merged.map((item) => item.number)).toEqual([2, 1])
    expect(merged[1].roles).toEqual(['assigned', 'authored'])
  })

  test('notifications keep their read state', () => {
    const [notification] = parseNotifications([
      {
        id: '9',
        unread: true,
        reason: 'review_requested',
        updated_at: '2026-03-01T00:00:00Z',
        subject: { title: 'Fix', type: 'PullRequest' },
        repository: { full_name: 'a/b' },
      },
    ])
    expect(notification).toEqual({
      id: '9',
      repo: 'a/b',
      title: 'Fix',
      kind: 'PullRequest',
      reason: 'review_requested',
      unread: true,
      updatedAt: '2026-03-01T00:00:00Z',
    })
    expect(parseNotifications({ message: 'Requires authentication' })).toEqual([])
  })
})
