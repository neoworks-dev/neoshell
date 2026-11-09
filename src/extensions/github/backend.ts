import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import { RetainedTopics, registerFunction } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { fetchContributions, fetchIssues, fetchRepos } from './fetchers.js'
import type { FetchStatus } from './model.js'
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

  private async fetchAll(): Promise<void> {
    const settings = this.settings
    const now = Date.now()
    await Promise.all([
      fetchContributions(settings, now).then((state) => this.publish('github.contributions', state)),
      fetchRepos(settings, now).then((state) => this.publish('github.repos', state)),
      fetchIssues(settings, now).then((state) => this.publish('github.issues', state)),
    ])
  }

  private publish(topic: string, state: Published): void {
    const kept = this.published.get(topic)
    if (state.status === 'error' && kept !== undefined && kept.status === 'ok') {
      return
    }
    this.published.set(topic, state)
    this.topics.set(topic, state)
  }
}
