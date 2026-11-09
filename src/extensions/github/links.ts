import { recordOf, stringOf } from '../../lib/record.js'
import type { ContributionsState, IssuesState, ReposState } from './model.js'

// The web pages the cards point at. Pure: the backend publishes these URLs
// with the state and opens only URLs it published itself.

const GITHUB_WEB_URL = /^https:\/\/github\.com\/[A-Za-z0-9_.~%+:@=&?#()*!/-]*$/
const SUBJECT_API_URL = /^https:\/\/api\.github\.com\/repos\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/(issues|pulls|commits|releases)\/([A-Za-z0-9]+)$/
const REPO_FULL_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

const WEB_PATH_OF_KIND: Record<string, string> = {
  issues: 'issues',
  pulls: 'pull',
  commits: 'commit',
}

/** Only pages on github.com over https are ever opened. */
export function isGithubWebUrl(url: string): boolean {
  return GITHUB_WEB_URL.test(url)
}

export function repoUrlOf(fullName: string): string {
  if (!REPO_FULL_NAME.test(fullName)) {
    return ''
  }
  return `https://github.com/${fullName}`
}

export function profileUrlOf(login: string): string {
  if (login === '') {
    return ''
  }
  return `https://github.com/${encodeURIComponent(login)}`
}

/**
 * The page for a notification's subject. The API names the subject by its API
 * URL; an issue, pull request or commit maps onto its web page, a release onto
 * the repository's releases, and anything else onto the repository.
 */
export function notificationUrlOf(subjectApiUrl: string, repoFullName: string): string {
  const match = SUBJECT_API_URL.exec(subjectApiUrl)
  if (match === null) {
    return repoUrlOf(repoFullName)
  }
  const [, fullName, kind, identifier] = match
  if (kind === 'releases') {
    return `${repoUrlOf(fullName)}/releases`
  }
  return `${repoUrlOf(fullName)}/${WEB_PATH_OF_KIND[kind]}/${identifier}`
}

/** github.com's issue search for the roles the card lists. */
export function issuesSearchUrlOf(roles: string[], who: string, withPullRequests: boolean): string {
  let query = 'is:open'
  if (!withPullRequests) {
    query += ' is:issue'
  }
  if (roles.length === 1) {
    query += ` ${roles[0]}:${who}`
  }
  if (roles.length > 1) {
    query += ` (${roles.map((role) => `${role}:${who}`).join(' OR ')})`
  }
  const encoded = encodeURIComponent(query).replace(/\(/g, '%28').replace(/\)/g, '%29')
  return `https://github.com/issues?q=${encoded}`
}

/** Every URL a contributions state points at. */
export function contributionLinksOf(state: ContributionsState): string[] {
  return [state.profileUrl]
}

export function repoLinksOf(state: ReposState): string[] {
  const links: string[] = []
  for (const repo of state.repos) {
    links.push(repo.url, ...repo.commits.map((commit) => commit.url))
  }
  return links
}

export function issueLinksOf(state: IssuesState): string[] {
  return [
    state.searchUrl,
    ...state.items.map((item) => item.url),
    ...state.notifications.map((notification) => notification.url),
  ]
}

export interface OpenRequest {
  url: string
  thread: string
}

/** Reads a github:open call; anything malformed becomes empty strings. */
export function openRequestOf(data: unknown): OpenRequest {
  const record = recordOf(data)
  return { url: stringOf(record.url), thread: stringOf(record.thread) }
}
