import Gio from 'gi://Gio'
import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import { RetainedTopics, registerFunction } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { fetchContributions, fetchIssues, fetchRepos } from './fetchers.js'
import { ghApiSucceeds } from './gh.js'
import { contributionLinksOf, isGithubWebUrl, issueLinksOf, openRequestOf, repoLinksOf } from './links.js'
import type { FetchStatus, IssuesState } from './model.js'
import { sameFetchSettings, settingsOf } from './settings.js'
import type { GithubSettings } from './settings.js'

// github: the signed-in account's activity as retained bus topics, read
// through the `gh` CLI, which keeps the authentication.
//
//   github.contributions  {status, message, login, total, days, currentStreak,
//                          longestStreak, activeDays, bestDay, updatedAt}
//   github.repos          {status, message, repos, updatedAt}
//   github.issues         {status, message, items, truncated, notifications,
//                          unreadCount, notificationsMessage, updatedAt}
//   github:refresh        {} → {ok}
//   github:open           {url, thread?} → {ok} | {error}
//
// github:open opens only a https://github.com URL that one of the topics
// above currently carries; a notification's thread id also marks it read.
//
// status is "ok", or why there is nothing to show: "missing" (no gh),
// "unauthenticated" (gh not signed in) or "error". A failed refresh keeps the
// last good state on the topic rather than blanking the cards over a network
// blip; missing and unauthenticated always replace it.
//
// What to fetch comes from the config's "github" section (see settings.ts),
// and a change to it fetches again at once.

const TICK_MS = 30_000
const MINUTE_MS = 60_000

const githubExtension: Plugin.Object = {
  name: 'github',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const topics = new RetainedTopics(bus)
    context.effect(() => () => topics.withdrawAll())
    const feeds = new GithubFeeds(topics)
    context.effect(() =>
      bus.subscribe('config', (message) => {
        feeds.configure(message.data)
      }),
    )
    registerFunction(context, bus, 'github:refresh', () => {
      void feeds.refresh()
      return { ok: true }
    })
    registerFunction(context, bus, 'github:open', (data) => feeds.open(data))
    context.effect(() => {
      const timer = setInterval(() => feeds.refreshWhenDue(), TICK_MS)
      return () => {
        clearInterval(timer)
      }
    })
  },
}

export default githubExtension

interface Published {
  status: FetchStatus
}

class GithubFeeds {
  private readonly topics: RetainedTopics
  private readonly published = new Map<string, Published>()
  // The URLs each topic's last state points at: the only ones github:open opens.
  private readonly links = new Map<string, Set<string>>()
  private unreadThreads = new Set<string>()
  private settings: GithubSettings = settingsOf({})
  private configured = false
  private refreshing = false
  private queued = false
  private lastRefresh = 0

  constructor(topics: RetainedTopics) {
    this.topics = topics
  }

  configure(snapshot: unknown): void {
    const next = settingsOf(snapshot)
    const unchanged = this.configured && sameFetchSettings(this.settings, next)
    this.settings = next
    this.configured = true
    if (!unchanged) {
      void this.refresh()
    }
  }

  refreshWhenDue(): void {
    if (Date.now() - this.lastRefresh >= this.settings.pollMinutes * MINUTE_MS) {
      void this.refresh()
    }
  }

  async refresh(): Promise<void> {
    if (this.refreshing) {
      this.queued = true
      return
    }
    this.refreshing = true
    this.lastRefresh = Date.now()
    try {
      await this.fetchAll()
    } finally {
      this.refreshing = false
    }
    if (this.queued) {
      this.queued = false
      await this.refresh()
    }
  }

  // Opens a page the cards published, in the default browser. Clicking a
  // notification's thread also marks it read.
  async open(data: unknown): Promise<unknown> {
    const request = openRequestOf(data)
    if (!isGithubWebUrl(request.url) || !this.isPublished(request.url)) {
      return { error: 'Only links the GitHub cards show can be opened.' }
    }
    try {
      Gio.AppInfo.launch_default_for_uri(request.url, null)
    } catch (error) {
      return { error: String(error) }
    }
    if (this.unreadThreads.has(request.thread)) {
      void this.markRead(request.thread)
    }
    return { ok: true }
  }

  private isPublished(url: string): boolean {
    for (const links of this.links.values()) {
      if (links.has(url)) {
        return true
      }
    }
    return false
  }

  private async markRead(thread: string): Promise<void> {
    this.unreadThreads.delete(thread)
    const marked = await ghApiSucceeds(['--method', 'PATCH', `notifications/threads/${thread}`])
    if (marked) {
      void this.refresh()
    }
  }

  private async fetchAll(): Promise<void> {
    const settings = this.settings
    const now = Date.now()
    await Promise.all([
      fetchContributions(settings, now).then((state) =>
        this.publish('github.contributions', state, contributionLinksOf(state)),
      ),
      fetchRepos(settings, now).then((state) => this.publish('github.repos', state, repoLinksOf(state))),
      fetchIssues(settings, now).then((state) => {
        if (this.publish('github.issues', state, issueLinksOf(state))) {
          this.unreadThreads = unreadThreadsOf(state)
        }
      }),
    ])
  }

  // Returns whether the state replaced the topic's last one.
  private publish(topic: string, state: Published, links: string[]): boolean {
    const kept = this.published.get(topic)
    if (state.status === 'error' && kept !== undefined && kept.status === 'ok') {
      return false
    }
    this.published.set(topic, state)
    this.links.set(topic, new Set(links))
    this.topics.set(topic, state)
    return true
  }
}

function unreadThreadsOf(state: IssuesState): Set<string> {
  const unread = state.notifications.filter((notification) => notification.unread)
  return new Set(unread.map((notification) => notification.id))
}
