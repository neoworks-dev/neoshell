// Token tallies over time: today, Claude Code's five-hour windows, an hourly
// profile, and the words the card prints for them. Pure.

export interface Counted {
  time: number
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
}

export interface Tally {
  // Fresh tokens: what was sent or generated, not what the cache replayed.
  tokens: number
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
  messages: number
}

export interface Block {
  start: number
  end: number
  tokens: number
  messages: number
  last: number
}

const HOUR_MS = 3_600_000
const MINUTE_MS = 60_000
export const WINDOW_MS = 5 * HOUR_MS
export const HOURS_SHOWN = 12

export function emptyTally(): Tally {
  return { tokens: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0, messages: 0 }
}

export function freshTokensOf(entry: Counted): number {
  return entry.input + entry.output + entry.cacheWrite
}

export function tallyOf(entries: Counted[]): Tally {
  const tally = emptyTally()
  for (const entry of entries) {
    tally.tokens += freshTokensOf(entry)
    tally.input += entry.input
    tally.output += entry.output
    tally.cacheWrite += entry.cacheWrite
    tally.cacheRead += entry.cacheRead
    tally.messages += 1
  }
  return tally
}

export function since<Entry extends Counted>(entries: Entry[], start: number): Entry[] {
  return entries.filter((entry) => entry.time >= start)
}

/**
 * Five-hour windows as Claude Code counts them: a window opens with the first
 * message after the last one closed, at the start of that message's hour, and
 * closes five hours later. Entries need not be sorted.
 */
export function blocksOf(entries: Counted[]): Block[] {
  const sorted = [...entries].sort((first, second) => first.time - second.time)
  const blocks: Block[] = []
  for (const entry of sorted) {
    const current = blocks[blocks.length - 1]
    if (current === undefined || entry.time >= current.end) {
      blocks.push(newBlock(entry))
      continue
    }
    current.tokens += freshTokensOf(entry)
    current.messages += 1
    current.last = entry.time
  }
  return blocks
}

function newBlock(entry: Counted): Block {
  const start = Math.floor(entry.time / HOUR_MS) * HOUR_MS
  return { start, end: start + WINDOW_MS, tokens: freshTokensOf(entry), messages: 1, last: entry.time }
}

/** The window that is still open, or null when the last one has closed. */
export function activeBlockOf(blocks: Block[], now: number): Block | null {
  const last = blocks[blocks.length - 1]
  if (last === undefined || now >= last.end) {
    return null
  }
  return last
}

/** The most tokens any closed window held: what "full" means when no limit is set. */
export function busiestClosedBlock(blocks: Block[], now: number): number {
  return blocks.filter((block) => block.end <= now).reduce((most, block) => Math.max(most, block.tokens), 0)
}

/** Percent of `limit` used, uncapped; -1 when there is no limit to measure against. */
export function percentOf(tokens: number, limit: number): number {
  if (limit <= 0) {
    return -1
  }
  return Math.round((tokens / limit) * 100)
}

/** Fresh tokens in each of the last `count` hours, oldest first; the last is the hour in progress. */
export function hourlyTokens(entries: Counted[], now: number, count: number): number[] {
  const currentHour = Math.floor(now / HOUR_MS)
  const hours = Array.from({ length: count }, () => 0)
  for (const entry of entries) {
    const slot = count - 1 - (currentHour - Math.floor(entry.time / HOUR_MS))
    if (slot >= 0 && slot < count) {
      hours[slot] += freshTokensOf(entry)
    }
  }
  return hours
}

/** 980, 12.4k, 1.2M. */
export function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${trimmed(count / 1_000_000)}M`
  }
  if (count >= 10_000) {
    return `${Math.round(count / 1000)}k`
  }
  if (count >= 1000) {
    return `${trimmed(count / 1000)}k`
  }
  return String(Math.round(count))
}

function trimmed(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '')
}

/** "2h 14m", "45m", "3d 4h", "under a minute". */
export function formatDuration(ms: number): string {
  if (ms < MINUTE_MS) {
    return 'under a minute'
  }
  const minutes = Math.floor(ms / MINUTE_MS)
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`
  }
  return `${Math.floor(hours / 24)}d ${hours % 24}h`
}

/** "just now", "4m ago", "2h ago". */
export function formatAge(ms: number): string {
  if (ms < MINUTE_MS) {
    return 'just now'
  }
  const minutes = Math.floor(ms / MINUTE_MS)
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  return `${Math.floor(minutes / 60)}h ago`
}
