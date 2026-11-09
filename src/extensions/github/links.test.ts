import { describe, expect, test } from 'bun:test'
import {
  isGithubWebUrl,
  issuesSearchUrlOf,
  notificationUrlOf,
  openRequestOf,
  profileUrlOf,
  repoUrlOf,
} from './links'

describe('which URLs may be opened', () => {
  test('github.com pages over https', () => {
    expect(isGithubWebUrl('https://github.com/')).toBe(true)
    expect(isGithubWebUrl('https://github.com/octocat/hello/pull/12')).toBe(true)
    expect(isGithubWebUrl('https://github.com/issues?q=is%3Aopen+author%3A%40me')).toBe(true)
  })

  test('nothing else', () => {
    expect(isGithubWebUrl('http://github.com/octocat')).toBe(false)
    expect(isGithubWebUrl('https://github.com')).toBe(false)
    expect(isGithubWebUrl('https://github.com.evil.example/x')).toBe(false)
    expect(isGithubWebUrl('https://github.com@evil.example/x')).toBe(false)
    expect(isGithubWebUrl('https://api.github.com/repos/a/b')).toBe(false)
    expect(isGithubWebUrl('file:///etc/passwd')).toBe(false)
    expect(isGithubWebUrl('https://github.com/a b')).toBe(false)
    expect(isGithubWebUrl('https://github.com/a\nhttps://evil.example')).toBe(false)
    expect(isGithubWebUrl('')).toBe(false)
  })

  test('a call is read into strings whatever it carries', () => {
    expect(openRequestOf({ url: 'https://github.com/a/b', thread: '7' })).toEqual({
      url: 'https://github.com/a/b',
      thread: '7',
    })
    expect(openRequestOf({ url: 5 })).toEqual({ url: '', thread: '' })
    expect(openRequestOf(null)).toEqual({ url: '', thread: '' })
  })
})

describe('notification pages', () => {
  const repo = 'octocat/hello'

  test('an issue, a pull request and a commit map onto their web pages', () => {
    expect(notificationUrlOf('https://api.github.com/repos/octocat/hello/issues/12', repo)).toBe(
      'https://github.com/octocat/hello/issues/12',
    )
    expect(notificationUrlOf('https://api.github.com/repos/octocat/hello/pulls/9', repo)).toBe(
      'https://github.com/octocat/hello/pull/9',
    )
    expect(notificationUrlOf('https://api.github.com/repos/octocat/hello/commits/abc123def', repo)).toBe(
      'https://github.com/octocat/hello/commit/abc123def',
    )
  })

  test('a release maps onto the repository releases', () => {
    expect(notificationUrlOf('https://api.github.com/repos/octocat/hello/releases/4411', repo)).toBe(
      'https://github.com/octocat/hello/releases',
    )
  })

  test('anything else, or no subject, falls back to the repository', () => {
    expect(notificationUrlOf('https://api.github.com/repos/octocat/hello/check-suites/5', repo)).toBe(
      'https://github.com/octocat/hello',
    )
    expect(notificationUrlOf('', repo)).toBe('https://github.com/octocat/hello')
    expect(notificationUrlOf('', '')).toBe('')
  })

  test('a subject on another host is not followed', () => {
    expect(notificationUrlOf('https://evil.example/repos/octocat/hello/issues/1', repo)).toBe(
      'https://github.com/octocat/hello',
    )
  })
})

describe('profile, repository and search pages', () => {
  test('profile and repository', () => {
    expect(profileUrlOf('octocat')).toBe('https://github.com/octocat')
    expect(profileUrlOf('')).toBe('')
    expect(repoUrlOf('octocat/hello')).toBe('https://github.com/octocat/hello')
    expect(repoUrlOf('not a repo')).toBe('')
  })

  test('the issue search is a page that may be opened', () => {
    const both = issuesSearchUrlOf(['assignee', 'author'], '@me', true)
    expect(isGithubWebUrl(both)).toBe(true)
    expect(both).toBe('https://github.com/issues?q=is%3Aopen%20%28assignee%3A%40me%20OR%20author%3A%40me%29')
    expect(issuesSearchUrlOf(['author'], 'octocat', false)).toBe(
      'https://github.com/issues?q=is%3Aopen%20is%3Aissue%20author%3Aoctocat',
    )
  })
})
