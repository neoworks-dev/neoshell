import { modelLabel, projectOf, statusOf } from './activity.js'
import type { Activity, SessionStatus } from './activity.js'
import type { RateLimits, RateWindow } from './codexLog.js'
import { HOURS_SHOWN, activeBlockOf, blocksOf, busiestClosedBlock, hourlyTokens, percentOf, since, tallyOf } from './windows.js'
import type { Counted, Tally } from './windows.js'

// What the card is told: one summary per agent and one line per live session.

export type AgentId = 'claude' | 'codex'

// A usage window: Claude Code's five hours, or one of the plan's limits.
export interface WindowSummary {
  label: string
  // Percent of the limit; -1 when there is no limit to measure against.
  percent: number
  tokens: number
  limit: number
  resetsAt: number
  // False once the window has closed; the next message opens a new one.
  active: boolean
  // configured | auto | plan: where the limit came from.
  source: string
}

export interface AgentSummary {
  id: AgentId
  name: string
  // ok | missing (no logs found) | disabled
  status: string
  today: Tally
  window: WindowSummary | null
  weekly: WindowSummary | null
  plan: string
  // Fresh tokens in each of the last hours, oldest first.
  hourly: number[]
}

export interface SessionSummary {
  id: string
  agent: AgentId
  project: string
  branch: string
  title: string
  model: string
  what: string
  status: SessionStatus
  lastActivityAt: number
  contextTokens: number
}

export const AGENT_NAMES: Record<AgentId, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
}

const WEEK_MINUTES = 10_080
const MINUTE_MS = 60_000

export function emptyAgent(id: AgentId, status: string): AgentSummary {
  return {
    id,
    name: AGENT_NAMES[id],
    status,
    today: tallyOf([]),
    window: null,
    weekly: null,
    plan: '',
    hourly: Array.from({ length: HOURS_SHOWN }, () => 0),
  }
}

/** Claude Code: today, and the five-hour window as it counts them, against a limit that is set or learnt. */
export function claudeSummaryOf(entries: Counted[], now: number, dayStart: number, configuredLimit: number): AgentSummary {
  const blocks = blocksOf(entries)
  const active = activeBlockOf(blocks, now)
  const limit = claudeLimitOf(configuredLimit, busiestClosedBlock(blocks, now))
  return {
    ...emptyAgent('claude', 'ok'),
    today: tallyOf(since(entries, dayStart)),
    hourly: hourlyTokens(entries, now, HOURS_SHOWN),
    window: claudeWindowOf(active, limit, configuredLimit),
  }
}

function claudeLimitOf(configured: number, busiest: number): number {
  if (configured > 0) {
    return configured
  }
  return busiest
}

function claudeWindowOf(
  active: { tokens: number; end: number } | null,
  limit: number,
  configured: number,
): WindowSummary {
  const source = limitSourceOf(configured, limit)
  if (active === null) {
    return { label: '5-hour window', percent: percentOf(0, limit), tokens: 0, limit, resetsAt: 0, active: false, source }
  }
  return {
    label: '5-hour window',
    percent: percentOf(active.tokens, limit),
    tokens: active.tokens,
    limit,
    resetsAt: active.end,
    active: true,
    source,
  }
}

function limitSourceOf(configured: number, limit: number): string {
  if (configured > 0) {
    return 'configured'
  }
  if (limit > 0) {
    return 'auto'
  }
  return 'none'
}

/** Codex: today from the token counters, and the plan's own limits as last reported. */
export function codexSummaryOf(usage: Counted[], limits: RateLimits | null, now: number, dayStart: number): AgentSummary {
  const base = emptyAgent('codex', 'ok')
  const summary: AgentSummary = {
    ...base,
    today: tallyOf(since(usage, dayStart)),
    hourly: hourlyTokens(usage, now, HOURS_SHOWN),
  }
  if (limits === null) {
    return summary
  }
  return {
    ...summary,
    plan: limits.plan,
    window: planWindowOf(limits.primary, usage, now),
    weekly: planWindowOf(limits.secondary, usage, now),
  }
}

function planWindowOf(window: RateWindow | null, usage: Counted[], now: number): WindowSummary | null {
  if (window === null) {
    return null
  }
  const start = window.resetsAt - window.windowMinutes * MINUTE_MS
  const expired = window.resetsAt <= now
  return {
    label: planWindowLabelOf(window.windowMinutes),
    percent: percentOfWindow(window, expired),
    tokens: tallyOf(since(usage, start)).tokens,
    limit: 0,
    resetsAt: window.resetsAt,
    active: !expired,
    source: 'plan',
  }
}

// A window that has closed since the last report is empty again.
function percentOfWindow(window: RateWindow, expired: boolean): number {
  if (expired) {
    return 0
  }
  return Math.round(window.usedPercent)
}

export function planWindowLabelOf(minutes: number): string {
  if (minutes === WEEK_MINUTES) {
    return 'Weekly'
  }
  if (minutes > 0 && minutes % 60 === 0 && minutes <= 24 * 60) {
    return `${minutes / 60}-hour window`
  }
  if (minutes > 0) {
    return `${minutes}-minute window`
  }
  return 'Window'
}

export interface SessionInput {
  agent: AgentId
  id: string
  activity: Activity
  // When the session's log last changed: later than the last line it parsed
  // to something, when a tool result or a streamed block came after.
  fileTime: number
  // When a sub-agent of the session last wrote; 0 when none has.
  subagentTime: number
}

const SUBAGENT_JUST_NOW_MS = 45_000
const SUBAGENT_WHAT = 'Sub-agent working'

export function sessionSummaryOf(input: SessionInput, now: number): SessionSummary {
  const activity = { ...input.activity, time: Math.max(input.activity.time, input.fileTime) }
  const subagentBusy = input.subagentTime > 0 && now - input.subagentTime < SUBAGENT_JUST_NOW_MS
  const status = statusOf(activity, now)
  const delegating = status === 'idle' && subagentBusy
  return {
    id: input.id,
    agent: input.agent,
    project: projectOf(activity.cwd),
    branch: activity.branch,
    title: activity.title,
    model: modelNameOf(input.agent, activity.model),
    what: whatOf(activity.what, delegating),
    status: workingOf(status, delegating),
    lastActivityAt: Math.max(activity.time, input.subagentTime),
    contextTokens: activity.contextTokens,
  }
}

function whatOf(what: string, delegating: boolean): string {
  if (delegating) {
    return SUBAGENT_WHAT
  }
  return what
}

function workingOf(status: SessionStatus, delegating: boolean): SessionStatus {
  if (delegating) {
    return 'working'
  }
  return status
}

function modelNameOf(agent: AgentId, model: string): string {
  if (agent === 'claude') {
    return modelLabel(model)
  }
  return model
}

/** Working first, then the most recently active. */
export function sortedSessions(sessions: SessionSummary[]): SessionSummary[] {
  return [...sessions].sort((first, second) => {
    if (first.status !== second.status) {
      if (first.status === 'working') {
        return -1
      }
      return 1
    }
    return second.lastActivityAt - first.lastActivityAt
  })
}
