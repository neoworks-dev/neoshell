import { formatDuration, formatTokens } from './windows.js'
import type { AgentSummary, SessionSummary, WindowSummary } from './summary.js'

// The words and tones the card prints for an agent's usage.

/** The meter's tone: it warms as the window fills. */
export function meterToneOf(percent: number): string {
  if (percent >= 90) {
    return 'error'
  }
  if (percent >= 75) {
    return 'warning'
  }
  return 'accent'
}

/** The percent a window has used, or 0 when there is no window or no limit. */
export function percentOfWindow(window: WindowSummary | null): number {
  if (window === null || window.percent < 0) {
    return 0
  }
  return window.percent
}

/** Fraction of the meter to fill: the percent, held to the track. */
export function meterFractionOf(window: WindowSummary | null): number {
  if (window === null || window.percent < 0) {
    return 0
  }
  return Math.min(1, window.percent / 100)
}

/** The headline: "54%" of a window, or the tokens when there is no limit to be a percent of. */
export function headlineOf(window: WindowSummary | null): string {
  if (window === null) {
    return '–'
  }
  if (window.percent >= 0) {
    return `${window.percent}%`
  }
  return formatTokens(window.tokens)
}

/** What the headline is a headline of. */
export function headlineCaptionOf(window: WindowSummary | null, agent: AgentSummary): string {
  if (window === null && agent.today.messages === 0) {
    return 'no recent activity'
  }
  if (window === null) {
    return 'no limits reported'
  }
  if (window.percent < 0) {
    return 'tokens this window'
  }
  return `of ${shortLabelOf(window.label)}`
}

/** "5-hour window" → "5h window", which still fits beside a large number. */
export function shortLabelOf(label: string): string {
  return label.replace('-hour', 'h')
}

export function resetLineOf(window: WindowSummary | null, now: number): string {
  if (window === null) {
    return ''
  }
  if (!window.active) {
    return 'No active window'
  }
  return `Resets in ${formatDuration(window.resetsAt - now)}`
}

/** The compact row's second line: when the window resets and what has been used today. */
export function compactDetailOf(agent: AgentSummary, now: number): string {
  return [resetLineOf(agent.window, now), todayLineOf(agent)].filter((part) => part !== '').join(' · ')
}

export function todayLineOf(agent: AgentSummary): string {
  return `${formatTokens(agent.today.tokens)} today`
}

/** Where the limit behind the percent came from, for the tooltip and the settings. */
export function limitNoteOf(window: WindowSummary | null): string {
  if (window === null) {
    return ''
  }
  if (window.source === 'plan') {
    return 'Reported by the plan'
  }
  if (window.source === 'configured') {
    return `Against your limit of ${formatTokens(window.limit)} tokens`
  }
  if (window.source === 'auto') {
    return `Against your busiest window, ${formatTokens(window.limit)} tokens`
  }
  return 'Set a limit in Settings to see a percentage'
}

/** The agents worth a column: those switched on, with or without anything to show yet. */
export function shownAgentsOf(agents: AgentSummary[]): AgentSummary[] {
  return agents.filter((agent) => agent.status === 'ok')
}

/** "2 working · 1 idle", or "No agent running" when no session is live. */
export function sessionCountLineOf(sessions: SessionSummary[]): string {
  const working = sessions.filter((session) => session.status === 'working').length
  const idle = sessions.length - working
  if (sessions.length === 0) {
    return 'No agent running'
  }
  return [countPartOf(working, 'working'), countPartOf(idle, 'idle')].filter((part) => part !== '').join(' · ')
}

function countPartOf(count: number, word: string): string {
  if (count === 0) {
    return ''
  }
  return `${count} ${word}`
}

export function contextLabelOf(tokens: number): string {
  if (tokens <= 0) {
    return ''
  }
  return `${formatTokens(tokens)} ctx`
}

/** The second line of a session: what it is doing, and where. */
export function sessionDetailOf(what: string, project: string, branch: string): string {
  const place = [project, branch].filter((part) => part !== '').join(' · ')
  return [what, place].filter((part) => part !== '').join(' · ')
}
