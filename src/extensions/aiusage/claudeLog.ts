import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record.js'
import { describeTool, snippetOf } from './activity.js'
import type { Activity } from './activity.js'

// Claude Code's session logs: ~/.claude/projects/<project>/<session>.jsonl,
// one JSON object per line. An assistant line carries message.usage, and one
// response is written once per content block (thinking, text, each tool call)
// with the same message id, so the entries are keyed by it and merged.

export interface UsageEntry {
  key: string
  time: number
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
  model: string
  session: string
}

/** What a line of the log has to contain to be worth parsing for usage. */
export const CLAUDE_USAGE_MARKER = '"output_tokens"'

const SYNTHETIC_MODEL = '<synthetic>'
const SYSTEM_TEXT_PREFIX = '<'

export function parseClaudeUsageLine(line: string, session: string): UsageEntry | null {
  return usageEntryOf(recordOfJson(line), session)
}

function usageEntryOf(record: Record<string, unknown>, session: string): UsageEntry | null {
  if (record.type !== 'assistant') {
    return null
  }
  const message = recordOf(record.message)
  const usage = recordOf(message.usage)
  const time = Date.parse(stringOf(record.timestamp))
  const model = stringOf(message.model)
  if (Number.isNaN(time) || model === SYNTHETIC_MODEL || Object.keys(usage).length === 0) {
    return null
  }
  return {
    key: entryKeyOf(record, message),
    time,
    input: numberOf(usage.input_tokens, 0),
    output: numberOf(usage.output_tokens, 0),
    cacheWrite: numberOf(usage.cache_creation_input_tokens, 0),
    cacheRead: numberOf(usage.cache_read_input_tokens, 0),
    model,
    session,
  }
}

function entryKeyOf(record: Record<string, unknown>, message: Record<string, unknown>): string {
  const messageId = stringOf(message.id)
  if (messageId === '') {
    return stringOf(record.uuid)
  }
  return `${messageId}:${stringOf(record.requestId)}`
}

/** The same response seen again: streaming writes grow its usage, so the larger reading of each count wins. */
export function mergedEntry(known: UsageEntry, seen: UsageEntry): UsageEntry {
  return {
    ...known,
    time: Math.min(known.time, seen.time),
    input: Math.max(known.input, seen.input),
    output: Math.max(known.output, seen.output),
    cacheWrite: Math.max(known.cacheWrite, seen.cacheWrite),
    cacheRead: Math.max(known.cacheRead, seen.cacheRead),
  }
}

/** The size of the conversation a response was made from: everything sent to the model. */
export function contextTokensOf(entry: UsageEntry): number {
  return entry.input + entry.cacheWrite + entry.cacheRead
}

/** Where a session log lives: its id, and whether it is a sub-agent's. */
export function sessionOfPath(path: string): { session: string; subagent: boolean } {
  const parts = path.split('/')
  const file = parts[parts.length - 1].replace(/\.jsonl$/, '')
  const subagentIndex = parts.lastIndexOf('subagents')
  if (subagentIndex > 0) {
    return { session: parts[subagentIndex - 1], subagent: true }
  }
  return { session: file, subagent: false }
}

/** Where the last lines of a session log leave the session: what it is doing, and with which model. */
export function claudeActivityOf(lines: string[]): Activity | null {
  let activity: Activity | null = null
  for (const line of lines) {
    activity = foldClaudeLine(activity, recordOfJson(line))
  }
  return lastSeenOf(activity)
}

// An activity with no time never saw a line that said anything.
function lastSeenOf(activity: Activity | null): Activity | null {
  if (activity === null || activity.time === 0) {
    return null
  }
  return activity
}

function foldClaudeLine(previous: Activity | null, record: Record<string, unknown>): Activity | null {
  const kind = stringOf(record.type)
  const base = baseOf(previous, record)
  if (kind === 'ai-title') {
    return { ...base, title: stringOf(record.aiTitle) }
  }
  if (kind === 'assistant') {
    return foldAssistant(base, record)
  }
  if (kind === 'user' && record.isMeta !== true) {
    return foldUser(base, record)
  }
  return previous
}

function baseOf(previous: Activity | null, record: Record<string, unknown>): Activity {
  let known = emptyActivity()
  if (previous !== null) {
    known = previous
  }
  return {
    ...known,
    cwd: pick(stringOf(record.cwd), known.cwd),
    branch: pick(stringOf(record.gitBranch), known.branch),
  }
}

function emptyActivity(): Activity {
  return {
    time: 0,
    kind: 'none',
    what: '',
    stopReason: '',
    title: '',
    model: '',
    cwd: '',
    branch: '',
    contextTokens: 0,
  }
}

function pick(candidate: string, fallback: string): string {
  if (candidate !== '') {
    return candidate
  }
  return fallback
}

function foldAssistant(base: Activity, record: Record<string, unknown>): Activity {
  const message = recordOf(record.message)
  const blocks = arrayOf(message.content)
  const described = describeBlocks(blocks)
  const usage = usageEntryOf(record, '')
  const reason = stringOf(message.stop_reason)
  return {
    ...base,
    time: timeOf(record, base.time),
    kind: described.kind,
    what: pick(described.what, base.what),
    stopReason: pick(reason, base.stopReason),
    model: pick(stringOf(message.model), base.model),
    contextTokens: contextOf(usage, base.contextTokens),
  }
}

function contextOf(usage: UsageEntry | null, fallback: number): number {
  if (usage === null) {
    return fallback
  }
  return contextTokensOf(usage)
}

function timeOf(record: Record<string, unknown>, fallback: number): number {
  const time = Date.parse(stringOf(record.timestamp))
  if (Number.isNaN(time)) {
    return fallback
  }
  return time
}

// A tool call wins over text and text over thinking: the most specific thing
// the response said it was doing.
function describeBlocks(blocks: Record<string, unknown>[]): { kind: Activity['kind']; what: string } {
  const tool = blocks.find((block) => block.type === 'tool_use')
  if (tool !== undefined) {
    return { kind: 'tool', what: describeTool(stringOf(tool.name), recordOf(tool.input)) }
  }
  const text = blocks.find((block) => block.type === 'text' && stringOf(block.text).trim() !== '')
  if (text !== undefined) {
    return { kind: 'text', what: snippetOf(stringOf(text.text)) }
  }
  return { kind: 'thinking', what: 'Thinking' }
}

function foldUser(base: Activity, record: Record<string, unknown>): Activity {
  const time = timeOf(record, base.time)
  const content = recordOf(record.message).content
  if (typeof content === 'string') {
    return promptActivity(base, time, content)
  }
  const blocks = arrayOf(content)
  if (blocks.some((block) => block.type === 'tool_result')) {
    return { ...base, time, kind: 'tool-result', stopReason: '' }
  }
  const text = blocks.find((block) => block.type === 'text')
  if (text === undefined) {
    return base
  }
  return promptActivity(base, time, stringOf(text.text))
}

function promptActivity(base: Activity, time: number, text: string): Activity {
  if (text.trim() === '' || text.startsWith(SYSTEM_TEXT_PREFIX)) {
    return base
  }
  return { ...base, time, kind: 'prompt', what: snippetOf(text), stopReason: '' }
}

function recordOfJson(line: string): Record<string, unknown> {
  try {
    return recordOf(JSON.parse(line))
  } catch {
    return {}
  }
}
