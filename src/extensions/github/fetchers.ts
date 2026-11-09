import { ghApi } from './gh.js'
import type { GhResult } from './gh.js'
import { issuesSearchUrlOf } from './links.js'
import {
  failedContributions,
  mergeIssues,
  parseContributions,
  parseNotifications,
  parseRepo,
  parseSearchItems,
} from './model.js'
import type {
  ContributionsState,
  Failure,
  IssueEntry,
  IssuesState,
  NotificationEntry,
  ReposState,
  RepoEntry,
} from './model.js'
import { numberOf, recordOf } from '../../lib/record.js'
import type { GithubSettings } from './settings.js'

// One fetcher per topic: what to ask gh for, and the state to publish from
// the answer. A fetcher never throws; a failed call becomes a state the card
// shows.

const COMMITS_FETCHED = 30
const DEFAULT_REPO_COUNT = 3
const ISSUES_FETCHED = 30
const NOTIFICATIONS_FETCHED = 30

function calendarQuery(declaration: string, root: string): string {
  return (
    `query${declaration} { ${root} { login contributionsCollection { contributionCalendar ` +
    '{ totalContributions weeks { contributionDays { date contributionCount contributionLevel } } } } } }'
  )
}

const VIEWER_QUERY = calendarQuery('', 'viewer')
const USER_QUERY = calendarQuery('($login: String!)', 'user(login: $login)')

function contributionsArguments(user: string): string[] {
  if (user === '') {
    return ['graphql', '-f', `query=${VIEWER_QUERY}`]
  }
  return ['graphql', '-f', `query=${USER_QUERY}`, '-f', `login=${user}`]
}

export async function fetchContributions(settings: GithubSettings, now: number): Promise<ContributionsState> {
  const result = await ghApi(contributionsArguments(settings.user))
  if (!result.ok) {
    return failedContributions(result.failure, now)
  }
  const state = parseContributions(result.data, now)
  if (state === null) {
    return failedContributions({ status: 'error', message: 'No contribution data came back.' }, now)
  }
  return state
}

function failedRepos(failure: Failure, now: number): ReposState {
  return { ...failure, repos: [], updatedAt: now }
}

export async function fetchRepos(settings: GithubSettings, now: number): Promise<ReposState> {
  const names = await repoNamesOf(settings)
  if (!names.ok) {
    return failedRepos(names.failure, now)
  }
  const entries = await Promise.all(names.names.map((name) => fetchRepo(name, now)))
  const repos = entries.filter((entry): entry is RepoEntry => !('failure' in entry))
  const failures = entries.filter((entry): entry is { failure: Failure } => 'failure' in entry)
  if (repos.length === 0 && failures.length > 0) {
    return failedRepos(failures[0].failure, now)
  }
  return { status: 'ok', message: '', repos, updatedAt: now }
}

type RepoNames = { ok: true; names: string[] } | { ok: false; failure: Failure }

async function repoNamesOf(settings: GithubSettings): Promise<RepoNames> {
  if (settings.repos.length > 0) {
    return { ok: true, names: settings.repos }
  }
  const listing = await ghApi([
    listingPathOf(settings.user),
    '--method',
    'GET',
    '-f',
    'sort=pushed',
    '-f',
    `per_page=${DEFAULT_REPO_COUNT}`,
  ])
  if (!listing.ok) {
    return listing
  }
  if (!Array.isArray(listing.data)) {
    return { ok: true, names: [] }
  }
  return { ok: true, names: listing.data.map((entry) => String(recordOf(entry).full_name)) }
}

function listingPathOf(user: string): string {
  if (user === '') {
    return 'user/repos'
  }
  return `users/${user}/repos`
}

async function fetchRepo(name: string, now: number): Promise<RepoEntry | { failure: Failure }> {
  const [repository, commits] = await Promise.all([
    ghApi([`repos/${name}`]),
    ghApi([`repos/${name}/commits`, '--method', 'GET', '-f', `per_page=${COMMITS_FETCHED}`]),
  ])
  if (!repository.ok) {
    return { failure: repository.failure }
  }
  const commitsPayload = commitsOf(commits)
  const entry = parseRepo(repository.data, commitsPayload, now)
  if (entry === null) {
    return { failure: { status: 'error', message: `${name} could not be read.` } }
  }
  return entry
}

// A repository with no commits answers 409; that is an empty history, not a
// failure.
function commitsOf(result: GhResult): unknown {
  if (!result.ok) {
    return []
  }
  return result.data
}

function failedIssues(failure: Failure, now: number): IssuesState {
  return {
    ...failure,
    items: [],
    searchUrl: '',
    truncated: false,
    notifications: [],
    unreadCount: 0,
    notificationsMessage: '',
    updatedAt: now,
  }
}

export async function fetchIssues(settings: GithubSettings, now: number): Promise<IssuesState> {
  const [searches, notifications] = await Promise.all([
    searchIssues(settings),
    fetchNotifications(settings),
  ])
  if (!searches.ok) {
    return failedIssues(searches.failure, now)
  }
  if (!notifications.ok && !hasSearches(settings)) {
    return failedIssues(notifications.failure, now)
  }
  const entries = notificationEntriesOf(notifications)
  return {
    status: 'ok',
    message: '',
    items: searches.items,
    searchUrl: searchUrlOf(settings),
    truncated: searches.truncated,
    notifications: entries,
    unreadCount: entries.filter((entry) => entry.unread).length,
    notificationsMessage: notificationsMessageOf(notifications),
    updatedAt: now,
  }
}

function hasSearches(settings: GithubSettings): boolean {
  return settings.showAssigned || settings.showAuthored
}

// truncated: GitHub has more matches than the page that was fetched.
type SearchOutcome = { ok: true; items: IssueEntry[]; truncated: boolean } | { ok: false; failure: Failure }

function rolesOf(settings: GithubSettings): string[] {
  const roles: string[] = []
  if (settings.showAssigned) {
    roles.push('assignee')
  }
  if (settings.showAuthored) {
    roles.push('author')
  }
  return roles
}

function searchUrlOf(settings: GithubSettings): string {
  let who = '@me'
  if (settings.user !== '') {
    who = settings.user
  }
  return issuesSearchUrlOf(rolesOf(settings), who, settings.showPullRequests)
}

async function searchIssues(settings: GithubSettings): Promise<SearchOutcome> {
  const roles = rolesOf(settings)
  const results = await Promise.all(roles.map((role) => searchRole(settings, role)))
  const failed = results.find((result) => !result.ok)
  if (failed !== undefined && !failed.ok) {
    return failed
  }
  const lists = results.map(itemsOf)
  return { ok: true, items: mergeIssues(lists), truncated: results.some(isTruncated) }
}

function itemsOf(outcome: SearchOutcome): IssueEntry[] {
  if (!outcome.ok) {
    return []
  }
  return outcome.items
}

function isTruncated(outcome: SearchOutcome): boolean {
  return outcome.ok && outcome.truncated
}

async function searchRole(settings: GithubSettings, role: string): Promise<SearchOutcome> {
  let who = '@me'
  if (settings.user !== '') {
    who = settings.user
  }
  let query = `is:open ${role}:${who}`
  if (!settings.showPullRequests) {
    query += ' is:issue'
  }
  const result = await ghApi([
    'search/issues',
    '--method',
    'GET',
    '-f',
    `q=${query}`,
    '-f',
    'sort=updated',
    '-f',
    `per_page=${ISSUES_FETCHED}`,
  ])
  if (!result.ok) {
    return result
  }
  const items = parseSearchItems(result.data, roleNameOf(role))
  return { ok: true, items, truncated: numberOf(recordOf(result.data).total_count, 0) > items.length }
}

function roleNameOf(role: string): string {
  if (role === 'assignee') {
    return 'assigned'
  }
  return 'authored'
}

async function fetchNotifications(settings: GithubSettings): Promise<GhResult> {
  if (!settings.showNotifications) {
    return { ok: true, data: [] }
  }
  const args = ['notifications', '--method', 'GET', '-f', `per_page=${NOTIFICATIONS_FETCHED}`]
  if (!settings.unreadOnly) {
    args.push('-f', 'all=true')
  }
  return ghApi(args)
}

function notificationEntriesOf(result: GhResult): NotificationEntry[] {
  if (!result.ok) {
    return []
  }
  return parseNotifications(result.data)
}

function notificationsMessageOf(result: GhResult): string {
  if (result.ok) {
    return ''
  }
  return result.failure.message
}
