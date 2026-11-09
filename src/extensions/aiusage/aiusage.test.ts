import { describe, expect, test } from 'bun:test'
import { describeTool, modelLabel, projectOf, snippetOf, statusOf } from './activity.js'
import type { Activity } from './activity.js'
import {
  claudeActivityOf,
  contextTokensOf,
  mergedEntry,
  parseClaudeUsageLine,
  sessionOfPath,
} from './claudeLog.js'
import { NO_TOTALS, codexActivityOf, newerLimits, parseCodexTokenLine, usageDelta } from './codexLog.js'
import type { RateLimits } from './codexLog.js'
import { directoryOf, optionsOf } from './options.js'
import { claudeSummaryOf, codexSummaryOf, planWindowLabelOf, sessionSummaryOf, sortedSessions } from './summary.js'
import type { SessionSummary } from './summary.js'
import { aiUsageStateOf } from './topic.js'
import {
  activeBlockOf,
  blocksOf,
  busiestClosedBlock,
  formatAge,
  formatDuration,
  formatTokens,
  hourlyTokens,
  percentOf,
  since,
  tallyOf,
} from './windows.js'

const HOUR = 3_600_000
const MINUTE = 60_000
const NOW = Date.parse('2026-11-09T15:20:00Z')

function usageLine(fields: Record<string, unknown>): string {
  const { time, id, input, output, cacheWrite, cacheRead, content, stopReason, model, requestId } = {
    time: '2026-11-09T14:10:00Z',
    id: 'msg_1',
    input: 10,
    output: 20,
    cacheWrite: 100,
    cacheRead: 1000,
    content: [{ type: 'text', text: 'Hello there' }],
    stopReason: null,
    model: 'claude-opus-5-5',
    requestId: 'req_1',
    ...fields,
  }
  return JSON.stringify({
    type: 'assistant',
    timestamp: time,
    requestId,
    cwd: '/home/me/code/shell',
    gitBranch: 'main',
    message: {
      id,
      model,
      role: 'assistant',
      content,
      stop_reason: stopReason,
      usage: {
        input_tokens: input,
        output_tokens: output,
        cache_creation_input_tokens: cacheWrite,
        cache_read_input_tokens: cacheRead,
      },
    },
  })
}

describe('claude usage lines', () => {
  test('an assistant line carries the four counts', () => {
    const entry = parseClaudeUsageLine(usageLine({}), 'sess')
    expect(entry).toEqual({
      key: 'msg_1:req_1',
      time: Date.parse('2026-11-09T14:10:00Z'),
      input: 10,
      output: 20,
      cacheWrite: 100,
      cacheRead: 1000,
      model: 'claude-opus-5-5',
      session: 'sess',
    })
  })

  test('other lines, synthetic messages and nonsense are not usage', () => {
    expect(parseClaudeUsageLine(JSON.stringify({ type: 'user', message: { usage: {} } }), 's')).toBeNull()
    expect(parseClaudeUsageLine(usageLine({ model: '<synthetic>' }), 's')).toBeNull()
    expect(parseClaudeUsageLine('{"type":"assistant"', 's')).toBeNull()
    expect(parseClaudeUsageLine(JSON.stringify({ type: 'assistant', timestamp: 'x', message: { usage: { output_tokens: 1 } } }), 's')).toBeNull()
  })

  test('a response written block by block merges to the largest counts', () => {
    const first = parseClaudeUsageLine(usageLine({ output: 5 }), 's')
    const second = parseClaudeUsageLine(usageLine({ output: 40, time: '2026-11-09T14:10:03Z' }), 's')
    if (first === null || second === null) {
      throw new Error('lines did not parse')
    }
    const merged = mergedEntry(first, second)
    expect(merged.output).toBe(40)
    expect(merged.time).toBe(first.time)
    expect(contextTokensOf(merged)).toBe(1110)
  })

  test('sessions are named by their log, sub-agents by their parent', () => {
    expect(sessionOfPath('/h/.claude/projects/-h-code/abc-123.jsonl')).toEqual({ session: 'abc-123', subagent: false })
    expect(sessionOfPath('/h/.claude/projects/-h-code/abc-123/subagents/agent-9.jsonl')).toEqual({
      session: 'abc-123',
      subagent: true,
    })
  })
})

describe('claude activity', () => {
  test('a tool call says what it is doing, with the file or the description', () => {
    const lines = [
      usageLine({ content: [{ type: 'tool_use', name: 'Edit', input: { file_path: '/home/me/code/shell/src/a.ts' } }] }),
    ]
    const activity = claudeActivityOf(lines)
    expect(activity?.kind).toBe('tool')
    expect(activity?.what).toBe('Editing a.ts')
    expect(activity?.cwd).toBe('/home/me/code/shell')
    expect(activity?.branch).toBe('main')
    expect(activity?.contextTokens).toBe(1110)
  })

  test('the last thing said wins, and a title is kept', () => {
    const lines = [
      JSON.stringify({ type: 'ai-title', aiTitle: 'Fix the flaky test' }),
      usageLine({ content: [{ type: 'tool_use', name: 'Bash', input: { command: 'bun test', description: 'Run the tests' } }] }),
      JSON.stringify({ type: 'user', timestamp: '2026-11-09T14:11:00Z', message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] } }),
      usageLine({ time: '2026-11-09T14:12:00Z', id: 'msg_2', content: [{ type: 'text', text: 'All green.\nDone.' }], stopReason: 'end_turn' }),
    ]
    const activity = claudeActivityOf(lines)
    expect(activity?.title).toBe('Fix the flaky test')
    expect(activity?.kind).toBe('text')
    expect(activity?.what).toBe('All green. Done.')
    expect(activity?.stopReason).toBe('end_turn')
    expect(activity?.time).toBe(Date.parse('2026-11-09T14:12:00Z'))
  })

  test('a user prompt shows, system text does not', () => {
    const user = (text: string): string =>
      JSON.stringify({ type: 'user', timestamp: '2026-11-09T14:30:00Z', message: { role: 'user', content: [{ type: 'text', text }] } })
    expect(claudeActivityOf([user('Please add a gallery')])?.what).toBe('Please add a gallery')
    expect(claudeActivityOf([user('<system-reminder>hi</system-reminder>')])).toBeNull()
  })

  test('a tool result leaves what it was doing', () => {
    const lines = [
      usageLine({ content: [{ type: 'tool_use', name: 'Grep', input: { pattern: 'TODO' } }] }),
      JSON.stringify({ type: 'user', timestamp: '2026-11-09T14:10:30Z', message: { role: 'user', content: [{ type: 'tool_result' }] } }),
    ]
    const activity = claudeActivityOf(lines)
    expect(activity?.kind).toBe('tool-result')
    expect(activity?.what).toBe('Searching TODO')
  })

  test('garbage gives nothing', () => {
    expect(claudeActivityOf(['', 'nope', '{}'])).toBeNull()
  })

  test('tool descriptions', () => {
    expect(describeTool('Bash', { command: 'ls -la\nrm x' })).toBe('Running ls -la')
    expect(describeTool('WebSearch', { query: 'gtk css' })).toBe('Searching the web gtk css')
    expect(describeTool('mcp__neo__todos', {})).toBe('todos')
    expect(describeTool('Mystery', {})).toBe('Mystery')
    expect(describeTool('Read', { file_path: '/a/b/c.ts' })).toBe('Reading c.ts')
  })

  test('long text is clipped on one line', () => {
    expect(snippetOf('a\n\n b   c')).toBe('a b c')
    expect(snippetOf('x'.repeat(200)).length).toBe(90)
  })

  test('model and project names', () => {
    expect(modelLabel('claude-opus-5-5')).toBe('Opus 5.5')
    expect(modelLabel('claude-sonnet-4-20250514')).toBe('Sonnet 4')
    expect(modelLabel('gpt-6-luna')).toBe('gpt-6-luna')
    expect(projectOf('/home/me/code/shell/')).toBe('shell')
    expect(projectOf('')).toBe('')
  })
})

function activity(fields: Partial<Activity>): Activity {
  return {
    time: NOW,
    kind: 'text',
    what: '',
    stopReason: '',
    title: '',
    model: '',
    cwd: '',
    branch: '',
    contextTokens: 0,
    ...fields,
  }
}

describe('session status', () => {
  test('a log that just moved is working', () => {
    expect(statusOf(activity({ time: NOW - 10_000 }), NOW)).toBe('working')
  })

  test('a finished turn is idle at once', () => {
    expect(statusOf(activity({ kind: 'done', time: NOW - 1000 }), NOW)).toBe('idle')
    expect(statusOf(activity({ kind: 'text', stopReason: 'end_turn', time: NOW - 1000 }), NOW)).toBe('idle')
  })

  test('a tool gets a few minutes of silence, a prompt a few more', () => {
    expect(statusOf(activity({ kind: 'tool', time: NOW - 2 * MINUTE }), NOW)).toBe('working')
    expect(statusOf(activity({ kind: 'tool', time: NOW - 4 * MINUTE }), NOW)).toBe('idle')
    expect(statusOf(activity({ kind: 'prompt', time: NOW - 4 * MINUTE }), NOW)).toBe('working')
    expect(statusOf(activity({ kind: 'prompt', time: NOW - 6 * MINUTE }), NOW)).toBe('idle')
  })

  test('the log file changing after the last parsed line keeps it working', () => {
    const session = sessionSummaryOf(
      {
        agent: 'claude',
        id: 's1',
        activity: activity({ kind: 'tool', time: NOW - 10 * MINUTE, cwd: '/a/shell', model: 'claude-opus-5-5' }),
        fileTime: NOW - 5000,
        subagentTime: 0,
      },
      NOW,
    )
    expect(session.status).toBe('working')
    expect(session.project).toBe('shell')
    expect(session.model).toBe('Opus 5.5')
  })

  test('a session that finished its turn is working while a sub-agent it started writes', () => {
    const finished = activity({ kind: 'text', stopReason: 'end_turn', time: NOW - 8 * MINUTE, what: 'Started the agents.' })
    const input = { agent: 'claude' as const, id: 's1', activity: finished, fileTime: NOW - 8 * MINUTE }
    const delegating = sessionSummaryOf({ ...input, subagentTime: NOW - 10_000 }, NOW)
    expect(delegating.status).toBe('working')
    expect(delegating.what).toBe('Sub-agent working')
    const quiet = sessionSummaryOf({ ...input, subagentTime: NOW - 5 * MINUTE }, NOW)
    expect(quiet.status).toBe('idle')
    expect(quiet.what).toBe('Started the agents.')
  })

  test('working sessions sort first, then the newest', () => {
    const make = (id: string, status: 'working' | 'idle', lastActivityAt: number): SessionSummary => ({
      id,
      agent: 'claude' as const,
      project: '',
      branch: '',
      title: '',
      model: '',
      what: '',
      status,
      lastActivityAt,
      contextTokens: 0,
    })
    const sorted = sortedSessions([make('old-idle', 'idle', 1), make('new-idle', 'idle', 9), make('busy', 'working', 5)])
    expect(sorted.map((session) => session.id)).toEqual(['busy', 'new-idle', 'old-idle'])
  })
})

function counted(time: number, tokens: number): { time: number; input: number; output: number; cacheWrite: number; cacheRead: number } {
  return { time, input: tokens, output: 0, cacheWrite: 0, cacheRead: 0 }
}

describe('windows', () => {
  test('a window opens at the hour of its first message and lasts five hours', () => {
    const blocks = blocksOf([counted(Date.parse('2026-11-09T10:25:00Z'), 100), counted(Date.parse('2026-11-09T12:00:00Z'), 50)])
    expect(blocks).toHaveLength(1)
    expect(blocks[0].start).toBe(Date.parse('2026-11-09T10:00:00Z'))
    expect(blocks[0].end).toBe(Date.parse('2026-11-09T15:00:00Z'))
    expect(blocks[0].tokens).toBe(150)
    expect(blocks[0].messages).toBe(2)
  })

  test('the first message after a window closes opens the next, whatever the order given', () => {
    const blocks = blocksOf([
      counted(Date.parse('2026-11-09T16:30:00Z'), 7),
      counted(Date.parse('2026-11-09T10:25:00Z'), 100),
      counted(Date.parse('2026-11-09T15:00:00Z'), 5),
    ])
    expect(blocks.map((block) => block.tokens)).toEqual([100, 12])
    expect(blocks[1].start).toBe(Date.parse('2026-11-09T15:00:00Z'))
  })

  test('the active window is the last one, until it ends', () => {
    const blocks = blocksOf([counted(Date.parse('2026-11-09T12:10:00Z'), 100)])
    expect(activeBlockOf(blocks, NOW)?.end).toBe(Date.parse('2026-11-09T17:00:00Z'))
    expect(activeBlockOf(blocks, Date.parse('2026-11-09T17:00:00Z'))).toBeNull()
    expect(activeBlockOf([], NOW)).toBeNull()
  })

  test('the busiest closed window is what full means', () => {
    const blocks = blocksOf([
      counted(Date.parse('2026-11-08T08:00:00Z'), 400),
      counted(Date.parse('2026-11-08T20:00:00Z'), 900),
      counted(Date.parse('2026-11-09T13:00:00Z'), 5000),
    ])
    expect(busiestClosedBlock(blocks, NOW)).toBe(900)
  })

  test('percent is against a limit, or unknown without one', () => {
    expect(percentOf(250, 1000)).toBe(25)
    expect(percentOf(1500, 1000)).toBe(150)
    expect(percentOf(250, 0)).toBe(-1)
  })

  test('fresh tokens leave out what the cache replayed', () => {
    const tally = tallyOf([{ time: NOW, input: 10, output: 20, cacheWrite: 100, cacheRead: 1000 }])
    expect(tally.tokens).toBe(130)
    expect(tally.cacheRead).toBe(1000)
    expect(tally.messages).toBe(1)
  })

  test('hours are counted back from the current one', () => {
    const entries = [counted(NOW - 5 * MINUTE, 10), counted(NOW - HOUR - 5 * MINUTE, 20), counted(NOW - 30 * HOUR, 999)]
    const hours = hourlyTokens(entries, NOW, 12)
    expect(hours).toHaveLength(12)
    expect(hours[11]).toBe(10)
    expect(hours[10]).toBe(20)
    expect(hours.reduce((sum, hour) => sum + hour, 0)).toBe(30)
  })

  test('entries since a time', () => {
    expect(since([counted(5, 1), counted(10, 1)], 7)).toHaveLength(1)
  })

  test('tokens and durations read as people say them', () => {
    expect(formatTokens(980)).toBe('980')
    expect(formatTokens(1234)).toBe('1.2k')
    expect(formatTokens(12_400)).toBe('12k')
    expect(formatTokens(1_200_000)).toBe('1.2M')
    expect(formatTokens(2_000_000)).toBe('2M')
    expect(formatDuration(30_000)).toBe('under a minute')
    expect(formatDuration(45 * MINUTE)).toBe('45m')
    expect(formatDuration(2 * HOUR + 14 * MINUTE)).toBe('2h 14m')
    expect(formatDuration(76 * HOUR)).toBe('3d 4h')
    expect(formatAge(20_000)).toBe('just now')
    expect(formatAge(4 * MINUTE)).toBe('4m ago')
    expect(formatAge(3 * HOUR)).toBe('3h ago')
  })
})

describe('claude summary', () => {
  const midnight = Date.parse('2026-11-09T00:00:00Z')
  const entries = [
    counted(Date.parse('2026-11-08T08:30:00Z'), 800),
    counted(Date.parse('2026-11-09T12:10:00Z'), 300),
    counted(Date.parse('2026-11-09T14:00:00Z'), 200),
  ]

  test('today, the open window and a limit learnt from the busiest closed one', () => {
    const summary = claudeSummaryOf(entries, NOW, midnight, 0)
    expect(summary.today.tokens).toBe(500)
    expect(summary.window?.tokens).toBe(500)
    expect(summary.window?.limit).toBe(800)
    expect(summary.window?.percent).toBe(63)
    expect(summary.window?.source).toBe('auto')
    expect(summary.window?.resetsAt).toBe(Date.parse('2026-11-09T17:00:00Z'))
    expect(summary.window?.active).toBe(true)
  })

  test('a configured limit wins', () => {
    const summary = claudeSummaryOf(entries, NOW, midnight, 1000)
    expect(summary.window?.percent).toBe(50)
    expect(summary.window?.source).toBe('configured')
  })

  test('with no closed window and no limit there is no percent', () => {
    const summary = claudeSummaryOf([counted(Date.parse('2026-11-09T14:00:00Z'), 200)], NOW, midnight, 0)
    expect(summary.window?.percent).toBe(-1)
    expect(summary.window?.source).toBe('none')
  })

  test('once the window has closed it is empty until the next message', () => {
    const summary = claudeSummaryOf([counted(Date.parse('2026-11-09T08:10:00Z'), 200)], NOW, midnight, 1000)
    expect(summary.window?.active).toBe(false)
    expect(summary.window?.percent).toBe(0)
    expect(summary.window?.tokens).toBe(0)
  })
})

function tokenLine(time: string, totals: { input: number; cached: number; output: number }, limits?: Record<string, unknown>): string {
  return JSON.stringify({
    timestamp: time,
    type: 'event_msg',
    payload: {
      type: 'token_count',
      info: {
        total_token_usage: {
          input_tokens: totals.input,
          cached_input_tokens: totals.cached,
          output_tokens: totals.output,
        },
        last_token_usage: { input_tokens: 500 },
      },
      rate_limits: limits,
    },
  })
}

const LIMITS = {
  primary: { used_percent: 15, window_minutes: 300, resets_at: Date.parse('2026-11-09T17:00:00Z') / 1000 },
  secondary: { used_percent: 2.4, window_minutes: 10_080, resets_at: Date.parse('2026-11-14T10:00:00Z') / 1000 },
  plan_type: 'plus',
}

function limitsAt(time: string): RateLimits | null {
  const event = parseCodexTokenLine(tokenLine(time, { input: 1, cached: 0, output: 1 }, LIMITS))
  if (event === null) {
    return null
  }
  return event.limits
}

describe('codex token events', () => {
  test('an event carries the totals and the plan limits', () => {
    const event = parseCodexTokenLine(tokenLine('2026-11-09T14:00:00Z', { input: 1000, cached: 600, output: 50 }, LIMITS))
    expect(event?.totals).toEqual({ input: 1000, cached: 600, output: 50 })
    expect(event?.limits?.plan).toBe('plus')
    expect(event?.limits?.primary?.usedPercent).toBe(15)
    expect(event?.limits?.primary?.resetsAt).toBe(Date.parse('2026-11-09T17:00:00Z'))
    expect(event?.limits?.secondary?.windowMinutes).toBe(10_080)
  })

  test('a line with no limits, or no event, is read as far as it goes', () => {
    expect(parseCodexTokenLine(tokenLine('2026-11-09T14:00:00Z', { input: 1, cached: 0, output: 1 }))?.limits).toBeNull()
    expect(parseCodexTokenLine('{"type":"event_msg","payload":{"type":"task_started"}}')).toBeNull()
    expect(parseCodexTokenLine('x')).toBeNull()
  })

  test('what an event added is the change in the totals, cached tokens apart', () => {
    const first = parseCodexTokenLine(tokenLine('2026-11-09T14:00:00Z', { input: 1000, cached: 600, output: 50 }))
    const second = parseCodexTokenLine(tokenLine('2026-11-09T14:05:00Z', { input: 1800, cached: 1400, output: 90 }))
    if (first === null || second === null) {
      throw new Error('events did not parse')
    }
    expect(usageDelta(NO_TOTALS, first)).toEqual({ time: first.time, input: 400, output: 50, cacheWrite: 0, cacheRead: 600 })
    expect(usageDelta(first.totals, second)).toEqual({ time: second.time, input: 0, output: 40, cacheWrite: 0, cacheRead: 800 })
    expect(usageDelta(second.totals, second)).toEqual({ time: second.time, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 })
  })

  test('totals that went down start over', () => {
    const event = parseCodexTokenLine(tokenLine('2026-11-09T14:00:00Z', { input: 100, cached: 0, output: 10 }))
    if (event === null) {
      throw new Error('event did not parse')
    }
    expect(usageDelta({ input: 5000, cached: 100, output: 900 }, event).input).toBe(100)
  })

  test('the newer reading of the limits wins', () => {
    const old = limitsAt('2026-11-09T10:00:00Z')
    const recent = limitsAt('2026-11-09T14:00:00Z')
    expect(newerLimits(old, recent)).toBe(recent)
    expect(newerLimits(recent, old)).toBe(recent)
    expect(newerLimits(recent, null)).toBe(recent)
    expect(newerLimits(null, null)).toBeNull()
  })
})

describe('codex summary', () => {
  const limits = limitsAt('2026-11-09T14:00:00Z')
  const usage = [counted(Date.parse('2026-11-09T13:00:00Z'), 400), counted(Date.parse('2026-11-01T13:00:00Z'), 9)]

  test('the plan windows are shown as reported', () => {
    const summary = codexSummaryOf(usage, limits, NOW, Date.parse('2026-11-09T00:00:00Z'))
    expect(summary.plan).toBe('plus')
    expect(summary.window?.label).toBe('5-hour window')
    expect(summary.window?.percent).toBe(15)
    expect(summary.window?.tokens).toBe(400)
    expect(summary.window?.active).toBe(true)
    expect(summary.weekly?.label).toBe('Weekly')
    expect(summary.weekly?.percent).toBe(2)
    expect(summary.today.tokens).toBe(400)
  })

  test('a window that closed since the last report is empty', () => {
    const summary = codexSummaryOf(usage, limits, Date.parse('2026-11-10T00:00:00Z'), Date.parse('2026-11-10T00:00:00Z'))
    expect(summary.window?.active).toBe(false)
    expect(summary.window?.percent).toBe(0)
    expect(summary.weekly?.active).toBe(true)
  })

  test('without a limits line there are no windows', () => {
    const summary = codexSummaryOf(usage, null, NOW, 0)
    expect(summary.window).toBeNull()
    expect(summary.weekly).toBeNull()
  })

  test('window names', () => {
    expect(planWindowLabelOf(300)).toBe('5-hour window')
    expect(planWindowLabelOf(10_080)).toBe('Weekly')
    expect(planWindowLabelOf(45)).toBe('45-minute window')
    expect(planWindowLabelOf(0)).toBe('Window')
  })
})

describe('codex activity', () => {
  const line = (type: string, payload: Record<string, unknown>, time = '2026-11-09T15:00:00Z'): string =>
    JSON.stringify({ timestamp: time, type, payload })

  test('a turn in progress, with its command', () => {
    const activity = codexActivityOf([
      line('session_meta', { cwd: '/home/me/code/site' }),
      line('turn_context', { model: 'gpt-6-luna' }),
      line('event_msg', { type: 'task_started' }),
      line('response_item', { type: 'function_call', name: 'shell', arguments: JSON.stringify({ command: ['bash', '-lc', 'rg TODO'] }) }),
    ])
    expect(activity?.cwd).toBe('/home/me/code/site')
    expect(activity?.model).toBe('gpt-6-luna')
    expect(activity?.kind).toBe('tool')
    expect(activity?.what).toBe('Running bash -lc rg TODO')
  })

  test('a custom tool call carries its command in its code', () => {
    const activity = codexActivityOf([
      line('response_item', { type: 'custom_tool_call', name: 'exec', input: 'const r = await tools.exec_command({cmd:"ls -la", max:1});' }),
    ])
    expect(activity?.what).toBe('Running ls -la')
  })

  test('a finished turn is done and says what it did', () => {
    const activity = codexActivityOf([
      line('event_msg', { type: 'task_started' }),
      line('event_msg', { type: 'task_complete', last_agent_message: 'Created the files.' }),
    ])
    expect(activity?.kind).toBe('done')
    expect(activity?.what).toBe('Created the files.')
  })

  test('the user prompt and the context size', () => {
    const activity = codexActivityOf([
      line('event_msg', { type: 'item_completed', item: { type: 'UserMessage', content: [{ type: 'text', text: 'Make four sprites' }] } }),
      tokenLine('2026-11-09T15:00:05Z', { input: 1, cached: 0, output: 1 }),
    ])
    expect(activity?.what).toBe('Make four sprites')
    expect(activity?.contextTokens).toBe(500)
  })

  test('nothing parsed, nothing returned', () => {
    expect(codexActivityOf(['x', '{}'])).toBeNull()
  })
})

describe('settings and topic', () => {
  test('both agents are on by default', () => {
    expect(optionsOf({})).toEqual({ claude: true, codex: true, claudeLimit: 0, claudeDir: '', codexDir: '' })
    expect(optionsOf({ agents: { codex: false }, claudeLimit: 250000.4, claudeDir: ' /x ' })).toEqual({
      claude: true,
      codex: false,
      claudeLimit: 250000,
      claudeDir: '/x',
      codexDir: '',
    })
    expect(optionsOf({ claudeLimit: -5 }).claudeLimit).toBe(0)
  })

  test('directories default under home and expand a tilde', () => {
    expect(directoryOf('', '/home/me', '.claude/projects')).toBe('/home/me/.claude/projects')
    expect(directoryOf('~/logs', '/home/me', 'x')).toBe('/home/me/logs')
    expect(directoryOf('/srv/logs', '/home/me', 'x')).toBe('/srv/logs')
  })

  test('the topic is read defensively', () => {
    const state = aiUsageStateOf({
      agents: [
        { id: 'claude', status: 'ok', today: { tokens: 5 }, window: { percent: 40, active: true }, hourly: [1, 2] },
        { id: 'gemini' },
      ],
      sessions: [{ id: 's', agent: 'codex', status: 'working' }, { id: '', agent: 'claude' }, { id: 'x', agent: 'nope' }],
      scanning: true,
    })
    expect(state.agents).toHaveLength(1)
    expect(state.agents[0].name).toBe('Claude Code')
    expect(state.agents[0].today.tokens).toBe(5)
    expect(state.agents[0].window?.percent).toBe(40)
    expect(state.agents[0].weekly).toBeNull()
    expect(state.agents[0].hourly).toHaveLength(12)
    expect(state.sessions).toHaveLength(1)
    expect(state.sessions[0].status).toBe('working')
    expect(state.scanning).toBe(true)
    expect(aiUsageStateOf(null).agents).toEqual([])
  })
})
