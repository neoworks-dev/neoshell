import { recordOf } from '../../lib/record.js'

// The "github" section of the config, as the backend and the cards both read
// it:
//
//   "github": {
//     "user": "octocat",            // empty: the account gh is signed in as
//     "repos": ["owner/name"],      // empty: the account's most recently pushed
//     "pollMinutes": 10,
//     "assigned": true, "authored": true, "pullRequests": true,
//     "notifications": true, "unreadOnly": true
//   }

export interface GithubSettings {
  user: string
  repos: string[]
  pollMinutes: number
  showAssigned: boolean
  showAuthored: boolean
  showPullRequests: boolean
  showNotifications: boolean
  unreadOnly: boolean
}

export const DEFAULT_POLL_MINUTES = 10
export const MIN_POLL_MINUTES = 2
export const MAX_REPOS = 6

const USER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

export function isValidUser(user: string): boolean {
  return USER_PATTERN.test(user)
}

export function isValidRepo(repo: string): boolean {
  return REPO_PATTERN.test(repo) && !repo.includes('..')
}

export function settingsOf(snapshot: unknown): GithubSettings {
  const section = recordOf(recordOf(snapshot).github)
  return {
    user: userOf(section.user),
    repos: reposOf(section.repos),
    pollMinutes: pollMinutesOf(section.pollMinutes),
    showAssigned: flagOf(section.assigned, true),
    showAuthored: flagOf(section.authored, true),
    showPullRequests: flagOf(section.pullRequests, true),
    showNotifications: flagOf(section.notifications, true),
    unreadOnly: flagOf(section.unreadOnly, true),
  }
}

function userOf(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  const user = value.trim().replace(/^@/, '')
  if (!isValidUser(user)) {
    return ''
  }
  return user
}

function reposOf(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const repos = value.filter((entry) => typeof entry === 'string' && isValidRepo(entry))
  return [...new Set<string>(repos)].slice(0, MAX_REPOS)
}

function pollMinutesOf(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_POLL_MINUTES
  }
  return Math.max(MIN_POLL_MINUTES, Math.round(value))
}

function flagOf(value: unknown, fallback: boolean): boolean {
  if (typeof value !== 'boolean') {
    return fallback
  }
  return value
}

/** Whether a change to the config needs the data fetched again. */
export function sameFetchSettings(first: GithubSettings, second: GithubSettings): boolean {
  return JSON.stringify({ ...first, pollMinutes: 0 }) === JSON.stringify({ ...second, pollMinutes: 0 })
}
