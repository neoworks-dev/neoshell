import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record.js'
import { snippetOf } from './activity.js'
import type { Activity } from './activity.js'
import type { Counted } from './windows.js'

// Codex's session logs: ~/.codex/sessions/<year>/<month>/<day>/rollout-*.jsonl.
// A token_count event carries the session's running totals and, from OpenAI,
// the plan's rate limits as they stood: how much of the five-hour and the
// weekly window was used and when each resets. Those are the real numbers, so
// they are shown as they are rather than estimated.

/** What a line has to contain to be worth parsing for usage. */
export const CODEX_USAGE_MARKER = '"token_count"'

const SECONDS_TO_MS = 1000

export interface Totals {
  input: number
  cached: number
  output: number
}

export interface RateWindow {
  usedPercent: number
  windowMinutes: number
  // When the window resets, in ms since the epoch.
  resetsAt: number
}

export interface RateLimits {
  time: number
  primary: RateWindow | null
  secondary: RateWindow | null
  plan: string
}

export interface CodexTokenEvent {
  time: number
  totals: Totals
  limits: RateLimits | null
}

export const NO_TOTALS: Totals = { input: 0, cached: 0, output: 0 }

export function parseCodexTokenLine(line: string): CodexTokenEvent | null {
  const record = recordOfJson(line)
  const payload = recordOf(record.payload)
  const time = Date.parse(stringOf(record.timestamp))
  if (record.type !== 'event_msg' || payload.type !== 'token_count' || Number.isNaN(time)) {
    return null
  }
  const totals = recordOf(recordOf(payload.info).total_token_usage)
  return {
    time,
    totals: {
      input: numberOf(totals.input_tokens, 0),
      cached: numberOf(totals.cached_input_tokens, 0),
      output: numberOf(totals.output_tokens, 0),
    },
    limits: limitsOf(time, recordOf(payload.rate_limits)),
  }
}

function limitsOf(time: number, record: Record<string, unknown>): RateLimits | null {
  const primary = windowOf(record.primary)
  const secondary = windowOf(record.secondary)
  if (primary === null && secondary === null) {
    return null
  }
  return { time, primary, secondary, plan: stringOf(record.plan_type) }
}

function windowOf(value: unknown): RateWindow | null {
  const record = recordOf(value)
  if (typeof record.used_percent !== 'number' || typeof record.resets_at !== 'number') {
    return null
  }
  return {
    usedPercent: record.used_percent,
    windowMinutes: numberOf(record.window_minutes, 0),
    resetsAt: record.resets_at * SECONDS_TO_MS,
  }
}

/**
 * What one event added to the session: the difference of the running totals.
 * OpenAI counts cached tokens inside the input, so the fresh input is the rest.
 * A total that went down means the counter started over, and the new total is
 * all fresh.
 */
export function usageDelta(previous: Totals, event: CodexTokenEvent): Counted {
  const now = event.totals
  let base = previous
  if (now.input < previous.input || now.output < previous.output) {
    base = NO_TOTALS
  }
  const input = now.input - base.input
  const cached = Math.min(input, now.cached - base.cached)
  return {
    time: event.time,
    input: Math.max(0, input - cached),
    output: Math.max(0, now.output - base.output),
    cacheWrite: 0,
    cacheRead: Math.max(0, cached),
  }
}

/** The newer of two readings of the limits. */
export function newerLimits(known: RateLimits | null, seen: RateLimits | null): RateLimits | null {
  if (seen === null) {
    return known
  }
  if (known === null || seen.time >= known.time) {
    return seen
  }
  return known
}

/** Where the last lines of a rollout leave the session. */
export function codexActivityOf(lines: string[]): Activity | null {
  let activity: Activity | null = null
  for (const line of lines) {
    activity = foldCodexLine(activity, recordOfJson(line))
  }
  if (activity === null || activity.time === 0) {
    return null
  }
  return activity
}

function emptyActivity(): Activity {
  return { time: 0, kind: 'none', what: '', stopReason: '', title: '', model: '', cwd: '', branch: '', contextTokens: 0 }
}

function foldCodexLine(previous: Activity | null, record: Record<string, unknown>): Activity | null {
  let base = emptyActivity()
  if (previous !== null) {
    base = previous
  }
  const payload = recordOf(record.payload)
  const time = Date.parse(stringOf(record.timestamp))
  const kind = stringOf(record.type)
  if (kind === 'session_meta' || kind === 'turn_context') {
    return { ...base, cwd: pick(stringOf(payload.cwd), base.cwd), model: pick(stringOf(payload.model), base.model) }
  }
  if (Number.isNaN(time)) {
    return previous
  }
  if (kind === 'event_msg') {
    return foldEvent(base, time, payload)
  }
  if (kind === 'response_item') {
    return foldItem(base, time, payload)
  }
  return previous
}

function pick(candidate: string, fallback: string): string {
  if (candidate !== '') {
    return candidate
  }
  return fallback
}

function foldEvent(base: Activity, time: number, payload: Record<string, unknown>): Activity {
  const type = stringOf(payload.type)
  if (type === 'task_started') {
    return { ...base, time, kind: 'thinking', what: 'Thinking', stopReason: '' }
  }
  if (type === 'task_complete') {
    return { ...base, time, kind: 'done', what: snippetOf(stringOf(payload.last_agent_message)), stopReason: 'end_turn' }
  }
  if (type === 'token_count') {
    return { ...base, time: Math.max(base.time, time), contextTokens: lastInputOf(payload, base.contextTokens) }
  }
  if (type === 'item_completed') {
    return foldCompletedItem(base, time, recordOf(payload.item))
  }
  return base
}

function lastInputOf(payload: Record<string, unknown>, fallback: number): number {
  const last = recordOf(recordOf(payload.info).last_token_usage)
  return numberOf(last.input_tokens, fallback)
}

function foldCompletedItem(base: Activity, time: number, item: Record<string, unknown>): Activity {
  if (item.type !== 'UserMessage') {
    return base
  }
  const text = arrayOf(item.content).find((part) => part.type === 'text')
  if (text === undefined || stringOf(text.text).trim() === '') {
    return base
  }
  return { ...base, time, kind: 'prompt', what: snippetOf(stringOf(text.text)), stopReason: '' }
}

function foldItem(base: Activity, time: number, payload: Record<string, unknown>): Activity {
  const type = stringOf(payload.type)
  if (type === 'function_call' || type === 'custom_tool_call') {
    return { ...base, time, kind: 'tool', what: toolWhatOf(payload), stopReason: '' }
  }
  if (type === 'reasoning') {
    return { ...base, time, kind: 'thinking', what: 'Thinking', stopReason: '' }
  }
  if (type === 'message' && payload.role === 'assistant') {
    return foldAssistantMessage(base, time, payload)
  }
  return base
}

function foldAssistantMessage(base: Activity, time: number, payload: Record<string, unknown>): Activity {
  const text = arrayOf(payload.content).find((part) => part.type === 'output_text')
  if (text === undefined) {
    return base
  }
  return { ...base, time, kind: 'text', what: snippetOf(stringOf(text.text)), stopReason: '' }
}

// A shell call's command is the most telling part: function_call carries it in
// JSON arguments, a custom tool in its input text.
function toolWhatOf(payload: Record<string, unknown>): string {
  const name = stringOf(payload.name)
  const command = commandOf(payload)
  if (command === '') {
    return name
  }
  return `Running ${command}`
}

function commandOf(payload: Record<string, unknown>): string {
  const fromArguments = recordOfJson(stringOf(payload.arguments))
  for (const field of ['cmd', 'command']) {
    const value = fromArguments[field]
    if (typeof value === 'string') {
      return snippetOf(value)
    }
    if (Array.isArray(value)) {
      return snippetOf(value.filter((part) => typeof part === 'string').join(' '))
    }
  }
  const match = /cmd:\s*"((?:[^"\\]|\\.)*)"/.exec(stringOf(payload.input))
  if (match === null) {
    return ''
  }
  return snippetOf(match[1])
}

function recordOfJson(line: string): Record<string, unknown> {
  try {
    return recordOf(JSON.parse(line))
  } catch {
    return {}
  }
}
