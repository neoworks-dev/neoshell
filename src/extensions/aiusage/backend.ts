import type { Plugin } from '@neoworks/extension-system'
import GLib from 'gi://GLib'
import { RetainedTopics, registerFunction } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { sectionOf } from '../../lib/config.js'
import { requireService } from '../../lib/services.js'
import { claudeActivityOf, CLAUDE_USAGE_MARKER, mergedEntry, parseClaudeUsageLine, sessionOfPath } from './claudeLog.js'
import type { UsageEntry } from './claudeLog.js'
import { codexActivityOf, CODEX_USAGE_MARKER, NO_TOTALS, newerLimits, parseCodexTokenLine, usageDelta } from './codexLog.js'
import type { RateLimits, Totals } from './codexLog.js'
import { LogFollower } from './follower.js'
import { directoryExists, listLogFiles, readTail, statLogFile } from './logFiles.js'
import type { LogFile } from './logFiles.js'
import { DEFAULT_CLAUDE_SUBPATH, DEFAULT_CODEX_SUBPATH, directoryOf, optionsOf } from './options.js'
import { claudeSummaryOf, codexSummaryOf, emptyAgent, sessionSummaryOf, sortedSessions } from './summary.js'
import type { AgentSummary, SessionSummary } from './summary.js'
import type { Activity } from './activity.js'
import type { Counted } from './windows.js'

// aiusage: what coding agents are using and doing, read from the logs they
// keep on this machine. Nothing is sent anywhere and nothing is asked of the
// agents.
//
//   aiusage.state   {agents: [{id, name, status, today, window, weekly, plan,
//                     hourly}], sessions: [...], scanning, updatedAt}
//
// Claude Code logs each response's token usage but not the plan's limits, so
// its five-hour window is counted from the usage (windows.ts) and measured
// against a limit set in the settings, or against the busiest window of the
// last two days. Codex logs the plan's own limits with every token count, and
// those are shown as they were last reported.
//
// Settings come from the config topic's "aiusage" section (options.ts).

const POLL_MS = 20_000
const TICK_MS = 1000
// Two days: enough for today, the window that began before midnight, and a
// busiest window to measure against.
const LOOKBACK_MS = 48 * 3_600_000
// A session counts as live while its log has changed within this long.
const LIVE_MS = 20 * 60_000
const TAIL_BYTES = 192 * 1024
const MAX_SESSIONS = 8

interface TailCache {
  size: number
  modified: number
  activity: Activity | null
}

const aiUsageExtension: Plugin.Object = {
  name: 'aiusage',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const topics = new RetainedTopics(bus)
    context.effect(() => () => topics.withdrawAll())
    const usage = new AiUsage(topics)
    context.effect(() =>
      bus.subscribe('config', (message) => {
        usage.configure(message.data)
      }),
    )
    registerFunction(context, bus, 'aiusage:refresh', () => usage.refreshNow())
    context.effect(() => {
      const timer = setInterval(() => void usage.tick(), TICK_MS)
      return () => {
        clearInterval(timer)
      }
    })
  },
}

export default aiUsageExtension

class AiUsage {
  private readonly topics: RetainedTopics
  private options = optionsOf({})
  private optionsSignature = JSON.stringify(this.options)
  private readonly claudeEntries = new Map<string, UsageEntry>()
  private readonly codexUsage = new Map<string, Counted[]>()
  private readonly codexTotals = new Map<string, Totals>()
  private codexLimits: RateLimits | null = null
  private readonly tails = new Map<string, TailCache>()
  private readonly claudeFollower: LogFollower
  private readonly codexFollower: LogFollower
  private lastRefresh = 0
  private refreshing = false
  private scanned = false
  private stale = true

  constructor(topics: RetainedTopics) {
    this.topics = topics
    this.claudeFollower = new LogFollower(
      CLAUDE_USAGE_MARKER,
      (file, lines) => this.ingestClaude(file, lines),
      () => {},
    )
    this.codexFollower = new LogFollower(
      CODEX_USAGE_MARKER,
      (file, lines) => this.ingestCodex(file, lines),
      (path) => this.resetCodex(path),
    )
    this.topics.set('aiusage.state', { agents: [], sessions: [], scanning: true, updatedAt: Date.now() })
  }

  configure(snapshot: unknown): void {
    this.options = optionsOf(sectionOf(snapshot, 'aiusage'))
    const signature = JSON.stringify(this.options)
    if (signature === this.optionsSignature) {
      return
    }
    this.optionsSignature = signature
    this.claudeEntries.clear()
    this.claudeFollower.clear()
    this.codexFollower.clear()
    this.tails.clear()
    this.stale = true
  }

  async tick(): Promise<void> {
    const due = Date.now() - this.lastRefresh >= POLL_MS
    if (this.refreshing || !(due || this.stale)) {
      return
    }
    await this.refresh()
  }

  async refreshNow(): Promise<Record<string, unknown>> {
    await this.refresh()
    return { ok: true }
  }

  private async refresh(): Promise<void> {
    this.refreshing = true
    this.stale = false
    try {
      const now = Date.now()
      const claude = await this.scanClaude(now)
      const codex = await this.scanCodex(now)
      this.scanned = true
      this.publish(now, [claude.agent, codex.agent], [...claude.sessions, ...codex.sessions])
    } catch (error) {
      console.error('aiusage: scan failed:', error)
    } finally {
      this.lastRefresh = Date.now()
      this.refreshing = false
    }
  }

  private async scanClaude(now: number): Promise<{ agent: AgentSummary; sessions: SessionSummary[] }> {
    const home = GLib.get_home_dir()
    const directory = directoryOf(this.options.claudeDir, home, DEFAULT_CLAUDE_SUBPATH)
    if (!this.options.claude) {
      return { agent: emptyAgent('claude', 'disabled'), sessions: [] }
    }
    if (!directoryExists(directory)) {
      return { agent: emptyAgent('claude', 'missing'), sessions: [] }
    }
    const files = listLogFiles(directory, now - LOOKBACK_MS)
    await this.claudeFollower.follow(files)
    this.pruneClaude(now - LOOKBACK_MS)
    const entries = [...this.claudeEntries.values()]
    return {
      agent: claudeSummaryOf(entries, now, dayStartOf(now), this.options.claudeLimit),
      sessions: this.liveSessions('claude', files, now, claudeActivityOf),
    }
  }

  private async scanCodex(now: number): Promise<{ agent: AgentSummary; sessions: SessionSummary[] }> {
    const home = GLib.get_home_dir()
    const directory = directoryOf(this.options.codexDir, home, DEFAULT_CODEX_SUBPATH)
    if (!this.options.codex) {
      return { agent: emptyAgent('codex', 'disabled'), sessions: [] }
    }
    if (!directoryExists(directory)) {
      return { agent: emptyAgent('codex', 'missing'), sessions: [] }
    }
    const files = listLogFiles(directory, now - LOOKBACK_MS)
    await this.codexFollower.follow(files)
    const usage = [...this.codexUsage.values()].flat()
    return {
      agent: codexSummaryOf(usage, this.codexLimits, now, dayStartOf(now)),
      sessions: this.liveSessions('codex', files, now, codexActivityOf),
    }
  }

  private ingestClaude(file: LogFile, lines: string[]): void {
    const session = sessionOfPath(file.path).session
    for (const line of lines) {
      const entry = parseClaudeUsageLine(line, session)
      if (entry === null) {
        continue
      }
      const known = this.claudeEntries.get(entry.key)
      if (known === undefined) {
        this.claudeEntries.set(entry.key, entry)
      } else {
        this.claudeEntries.set(entry.key, mergedEntry(known, entry))
      }
    }
  }

  private pruneClaude(since: number): void {
    for (const [key, entry] of this.claudeEntries) {
      if (entry.time < since) {
        this.claudeEntries.delete(key)
      }
    }
  }

  // A rollout's token counts are running totals, so what a line added is the
  // difference from the line before it in the same file.
  private ingestCodex(file: LogFile, lines: string[]): void {
    let totals = this.codexTotals.get(file.path)
    if (totals === undefined) {
      totals = NO_TOTALS
    }
    const usage = this.codexUsage.get(file.path)
    const added: Counted[] = []
    for (const line of lines) {
      const event = parseCodexTokenLine(line)
      if (event === null) {
        continue
      }
      added.push(usageDelta(totals, event))
      totals = event.totals
      this.codexLimits = newerLimits(this.codexLimits, event.limits)
    }
    this.codexTotals.set(file.path, totals)
    if (usage === undefined) {
      this.codexUsage.set(file.path, added)
      return
    }
    usage.push(...added)
  }

  private resetCodex(path: string): void {
    this.codexUsage.delete(path)
    this.codexTotals.delete(path)
  }

  // Sessions whose log changed lately, with where each one is. A sub-agent's
  // log has no activity to show of its own, but while it moves the session
  // that started it is at work.
  private liveSessions(
    agent: 'claude' | 'codex',
    files: LogFile[],
    now: number,
    activityOf: (lines: string[]) => Activity | null,
  ): SessionSummary[] {
    const live = new Map<string, LiveSession>()
    for (const file of files) {
      if (now - file.modified > LIVE_MS) {
        continue
      }
      noteLiveFile(live, agent, file)
    }
    return [...live.entries()].flatMap(([id, found]) => this.sessionOf(agent, id, found, now, activityOf))
  }

  private sessionOf(
    agent: 'claude' | 'codex',
    id: string,
    found: LiveSession,
    now: number,
    activityOf: (lines: string[]) => Activity | null,
  ): SessionSummary[] {
    const tail = this.tailOf(found.path, activityOf)
    if (tail === null || tail.activity === null) {
      return []
    }
    const input = { agent, id, activity: tail.activity, fileTime: tail.modified, subagentTime: found.subagentModified }
    return [sessionSummaryOf(input, now)]
  }

  // The end of a session's own log, read again only when it has changed.
  private tailOf(path: string, activityOf: (lines: string[]) => Activity | null): TailCache | null {
    const info = statLogFile(path)
    if (info === null) {
      return null
    }
    const cached = this.tails.get(path)
    if (cached !== undefined && cached.size === info.size && cached.modified === info.modified) {
      return cached
    }
    const fresh = { size: info.size, modified: info.modified, activity: activityOf(readTail(path, info.size, TAIL_BYTES)) }
    this.tails.set(path, fresh)
    return fresh
  }

  private publish(now: number, agents: AgentSummary[], sessions: SessionSummary[]): void {
    this.topics.set('aiusage.state', {
      agents,
      sessions: sortedSessions(sessions).slice(0, MAX_SESSIONS),
      scanning: !this.scanned,
      updatedAt: now,
    })
  }
}

interface LiveSession {
  // The session's own log.
  path: string
  // When its newest sub-agent log changed; 0 when it has none live.
  subagentModified: number
}

function noteLiveFile(live: Map<string, LiveSession>, agent: 'claude' | 'codex', file: LogFile): void {
  const located = locateSession(agent, file.path)
  let found = live.get(located.session)
  if (found === undefined) {
    found = { path: located.mainPath, subagentModified: 0 }
    live.set(located.session, found)
  }
  if (located.subagent) {
    found.subagentModified = Math.max(found.subagentModified, file.modified)
  }
}

// A session's own log, whichever of its logs changed.
function locateSession(
  agent: 'claude' | 'codex',
  path: string,
): { session: string; mainPath: string; subagent: boolean } {
  if (agent === 'codex') {
    return { session: codexSessionOf(path), mainPath: path, subagent: false }
  }
  const located = sessionOfPath(path)
  if (!located.subagent) {
    return { session: located.session, mainPath: path, subagent: false }
  }
  const parts = path.split('/')
  const subagentIndex = parts.lastIndexOf('subagents')
  const mainPath = `${parts.slice(0, subagentIndex - 1).join('/')}/${located.session}.jsonl`
  return { session: located.session, mainPath, subagent: true }
}

function codexSessionOf(path: string): string {
  const name = path.split('/').pop()
  if (name === undefined) {
    return path
  }
  const match = /([0-9a-f]{8}-[0-9a-f-]{27})\.jsonl$/.exec(name)
  if (match === null) {
    return name
  }
  return match[1]
}

function dayStartOf(now: number): number {
  const date = GLib.DateTime.new_from_unix_local(Math.floor(now / 1000))
  const midnight = GLib.DateTime.new_local(date.get_year(), date.get_month(), date.get_day_of_month(), 0, 0, 0)
  return midnight.to_unix() * 1000
}
