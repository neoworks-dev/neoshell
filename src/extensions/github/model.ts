import { numberOf, recordOf, stringOf } from '../../lib/record.js'

// What the github backend publishes and how it reads what `gh` prints. Pure:
// nothing here spawns a process or touches the bus, so the backend, the cards
// and the tests all share it.

export type FetchStatus = 'ok' | 'missing' | 'unauthenticated' | 'error'

export interface Failure {
  status: FetchStatus
  message: string
}

export interface ContributionDay {
  date: string
  count: number
  // 0 (none) to 4, GitHub's own quartile buckets.
  level: number
}

export interface BestDay {
  date: string
  count: number
}

export interface ContributionStats {
  total: number
  currentStreak: number
  longestStreak: number
  activeDays: number
  bestDay: BestDay | null
}

export interface ContributionsState extends ContributionStats {
  status: FetchStatus
  message: string
  login: string
  // Oldest first, one entry per calendar day, whole weeks starting on Sunday.
  days: ContributionDay[]
  updatedAt: number
}

export interface RepoCommit {
  sha: string
  message: string
  author: string
  date: string
}

export interface RepoEntry {
  fullName: string
  description: string
  language: string
  stars: number
  forks: number
  openIssues: number
  pushedAt: string
  commits: RepoCommit[]
  // Commits per day over the last COMMIT_DAYS days, oldest first.
  dailyCounts: number[]
  weekCommits: number
}

export interface ReposState {
  status: FetchStatus
  message: string
  repos: RepoEntry[]
  updatedAt: number
}

export interface IssueEntry {
  url: string
  repo: string
  number: number
  title: string
  isPullRequest: boolean
  roles: string[]
  comments: number
  updatedAt: string
}

export interface NotificationEntry {
  id: string
  repo: string
  title: string
  kind: string
  reason: string
  unread: boolean
  updatedAt: string
}

export interface IssuesState {
  status: FetchStatus
  message: string
  items: IssueEntry[]
  // GitHub has more open items than were fetched.
  truncated: boolean
  notifications: NotificationEntry[]
  unreadCount: number
  // Set when only the notifications failed, so the issues can still show.
  notificationsMessage: string
  updatedAt: number
}

export const COMMIT_DAYS = 14
export const COMMITS_KEPT = 8
const DAY_MS = 86_400_000

const LEVELS: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

/** Reads a gh failure's stderr as the state the cards show for it. */
export function classifyFailure(stderr: string): Failure {
  const text = stderr.trim()
  const firstLine = text.split('\n')[0]
  if (text.includes('gh unavailable') || text.includes('executable file not found')) {
    return { status: 'missing', message: 'The GitHub CLI (gh) is not installed.' }
  }
  if (text.includes('gh auth login') || text.includes('HTTP 401') || text.includes('Bad credentials')) {
    return { status: 'unauthenticated', message: 'Not signed in. Run gh auth login.' }
  }
  if (text === '') {
    return { status: 'error', message: 'gh failed without saying why.' }
  }
  return { status: 'error', message: firstLine }
}

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** The contribution days out of a GraphQL contributionCalendar, oldest first. */
export function parseContributionDays(calendar: unknown): ContributionDay[] {
  const weeks = recordOf(calendar).weeks
  if (!Array.isArray(weeks)) {
    return []
  }
  const days: ContributionDay[] = []
  for (const week of weeks) {
    const weekDays = recordOf(week).contributionDays
    if (Array.isArray(weekDays)) {
      days.push(...weekDays.map(dayOf))
    }
  }
  return days
}

function dayOf(value: unknown): ContributionDay {
  const record = recordOf(value)
  return {
    date: stringOf(record.date),
    count: numberOf(record.contributionCount, 0),
    level: levelOf(record.contributionLevel),
  }
}

function levelOf(value: unknown): number {
  const level = LEVELS[stringOf(value)]
  if (level === undefined) {
    return 0
  }
  return level
}

/**
 * Today may still be empty without the streak being over, so a trailing
 * zero day is skipped when counting the current streak.
 */
export function currentStreakOf(days: ContributionDay[]): number {
  let index = days.length - 1
  if (index >= 0 && days[index].count === 0) {
    index -= 1
  }
  let streak = 0
  while (index >= 0 && days[index].count > 0) {
    streak += 1
    index -= 1
  }
  return streak
}

export function longestStreakOf(days: ContributionDay[]): number {
  let longest = 0
  let running = 0
  for (const day of days) {
    if (day.count > 0) {
      running += 1
    } else {
      running = 0
    }
    longest = Math.max(longest, running)
  }
  return longest
}

export function bestDayOf(days: ContributionDay[]): BestDay | null {
  let best: BestDay | null = null
  for (const day of days) {
    if (day.count > 0 && (best === null || day.count > best.count)) {
      best = { date: day.date, count: day.count }
    }
  }
  return best
}

export function statsOf(days: ContributionDay[], total: number): ContributionStats {
  return {
    total,
    currentStreak: currentStreakOf(days),
    longestStreak: longestStreakOf(days),
    activeDays: days.filter((day) => day.count > 0).length,
    bestDay: bestDayOf(days),
  }
}

/** A contributions state from the GraphQL reply, or null when it has none. */
export function parseContributions(payload: unknown, now: number): ContributionsState | null {
  const data = recordOf(recordOf(payload).data)
  const account = accountOf(data)
  const collection = recordOf(account.contributionsCollection)
  const calendar = recordOf(collection.contributionCalendar)
  const days = parseContributionDays(calendar)
  if (days.length === 0) {
    return null
  }
  return {
    status: 'ok',
    message: '',
    login: stringOf(account.login),
    days,
    updatedAt: now,
    ...statsOf(days, numberOf(calendar.totalContributions, 0)),
  }
}

// A named user's query answers under `user`, the signed-in account's under
// `viewer`.
function accountOf(data: Record<string, unknown>): Record<string, unknown> {
  if (data.user !== undefined && data.user !== null) {
    return recordOf(data.user)
  }
  return recordOf(data.viewer)
}

export function failedContributions(failure: Failure, now: number): ContributionsState {
  return {
    ...failure,
    login: '',
    days: [],
    updatedAt: now,
    ...statsOf([], 0),
  }
}

/** The first line of a commit message, which is all a row has room for. */
export function subjectOf(message: string): string {
  return message.split('\n')[0].trim()
}

export function parseCommits(payload: unknown): RepoCommit[] {
  if (!Array.isArray(payload)) {
    return []
  }
  return payload.map(commitOf)
}

function commitOf(value: unknown): RepoCommit {
  const record = recordOf(value)
  const commit = recordOf(record.commit)
  const author = recordOf(commit.author)
  const login = recordOf(record.author).login
  return {
    sha: stringOf(record.sha).slice(0, 7),
    message: subjectOf(stringOf(commit.message)),
    author: authorNameOf(login, author.name),
    date: stringOf(author.date),
  }
}

function authorNameOf(login: unknown, name: unknown): string {
  if (typeof login === 'string' && login !== '') {
    return login
  }
  return stringOf(name)
}

/** Commits per day for the last `days` days ending at `now`, oldest first. */
export function dailyCountsOf(commits: RepoCommit[], now: number, days: number): number[] {
  const counts = Array.from({ length: days }, () => 0)
  const today = Math.floor(now / DAY_MS)
  for (const commit of commits) {
    const ageDays = today - Math.floor(Date.parse(commit.date) / DAY_MS)
    if (ageDays >= 0 && ageDays < days) {
      counts[days - 1 - ageDays] += 1
    }
  }
  return counts
}

export function parseRepo(repository: unknown, commitsPayload: unknown, now: number): RepoEntry | null {
  const record = recordOf(repository)
  const fullName = stringOf(record.full_name)
  if (fullName === '') {
    return null
  }
  const commits = parseCommits(commitsPayload)
  const dailyCounts = dailyCountsOf(commits, now, COMMIT_DAYS)
  return {
    fullName,
    description: stringOf(record.description),
    language: stringOf(record.language),
    stars: numberOf(record.stargazers_count, 0),
    forks: numberOf(record.forks_count, 0),
    openIssues: numberOf(record.open_issues_count, 0),
    pushedAt: stringOf(record.pushed_at),
    commits: commits.slice(0, COMMITS_KEPT),
    dailyCounts,
    weekCommits: dailyCounts.slice(-7).reduce((sum, count) => sum + count, 0),
  }
}

/** The "owner/name" out of a search result's repository_url. */
export function repoOfUrl(repositoryUrl: string): string {
  const parts = repositoryUrl.split('/')
  return parts.slice(-2).join('/')
}

export function parseSearchItems(payload: unknown, role: string): IssueEntry[] {
  const items = recordOf(payload).items
  if (!Array.isArray(items)) {
    return []
  }
  return items.map((item) => issueOf(item, role))
}

function issueOf(value: unknown, role: string): IssueEntry {
  const record = recordOf(value)
  return {
    url: stringOf(record.html_url),
    repo: repoOfUrl(stringOf(record.repository_url)),
    number: numberOf(record.number, 0),
    title: stringOf(record.title),
    isPullRequest: record.pull_request !== undefined,
    roles: [role],
    comments: numberOf(record.comments, 0),
    updatedAt: stringOf(record.updated_at),
  }
}

/** Merges lists, newest first; an item in two lists keeps both roles. */
export function mergeIssues(lists: IssueEntry[][]): IssueEntry[] {
  const byUrl = new Map<string, IssueEntry>()
  for (const entry of lists.flat()) {
    const existing = byUrl.get(entry.url)
    if (existing === undefined) {
      byUrl.set(entry.url, { ...entry })
      continue
    }
    existing.roles = [...new Set([...existing.roles, ...entry.roles])]
  }
  return [...byUrl.values()].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
}

export function parseNotifications(payload: unknown): NotificationEntry[] {
  if (!Array.isArray(payload)) {
    return []
  }
  return payload.map(notificationOf)
}

function notificationOf(value: unknown): NotificationEntry {
  const record = recordOf(value)
  const subject = recordOf(record.subject)
  return {
    id: stringOf(record.id),
    repo: stringOf(recordOf(record.repository).full_name),
    title: stringOf(subject.title),
    kind: stringOf(subject.type),
    reason: stringOf(record.reason),
    unread: record.unread === true,
    updatedAt: stringOf(record.updated_at),
  }
}
