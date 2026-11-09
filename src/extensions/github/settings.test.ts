import { describe, expect, test } from 'bun:test'
import { DEFAULT_POLL_MINUTES, MAX_REPOS, MIN_POLL_MINUTES, sameFetchSettings, settingsOf } from './settings'

describe('settingsOf', () => {
  test('defaults with no section', () => {
    const settings = settingsOf({})
    expect(settings.user).toBe('')
    expect(settings.repos).toEqual([])
    expect(settings.pollMinutes).toBe(DEFAULT_POLL_MINUTES)
    expect(settings.showNotifications).toBe(true)
    expect(settings.unreadOnly).toBe(true)
  })

  test('drops an invalid user and strips a leading @', () => {
    expect(settingsOf({ github: { user: '@octocat' } }).user).toBe('octocat')
    expect(settingsOf({ github: { user: 'not a user!' } }).user).toBe('')
    expect(settingsOf({ github: { user: 42 } }).user).toBe('')
  })

  test('keeps valid, distinct repositories up to the limit', () => {
    const repos = ['a/b', 'a/b', '../etc/passwd', 'noslash', 'c/d.js', 3, 'e/f', 'g/h', 'i/j', 'k/l', 'm/n']
    const found = settingsOf({ github: { repos } }).repos
    expect(found.slice(0, 3)).toEqual(['a/b', 'c/d.js', 'e/f'])
    expect(found.length).toBe(MAX_REPOS)
  })

  test('clamps the interval', () => {
    expect(settingsOf({ github: { pollMinutes: 0 } }).pollMinutes).toBe(MIN_POLL_MINUTES)
    expect(settingsOf({ github: { pollMinutes: 30 } }).pollMinutes).toBe(30)
    expect(settingsOf({ github: { pollMinutes: 'x' } }).pollMinutes).toBe(DEFAULT_POLL_MINUTES)
  })

  test('reads the filters', () => {
    const settings = settingsOf({ github: { assigned: false, pullRequests: false } })
    expect(settings.showAssigned).toBe(false)
    expect(settings.showAuthored).toBe(true)
    expect(settings.showPullRequests).toBe(false)
  })

  test('the interval alone does not change what is fetched', () => {
    const first = settingsOf({ github: { pollMinutes: 5 } })
    const second = settingsOf({ github: { pollMinutes: 20 } })
    expect(sameFetchSettings(first, second)).toBe(true)
    expect(sameFetchSettings(first, settingsOf({ github: { user: 'x' } }))).toBe(false)
  })
})
