import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record.js'
import { HOURS_SHOWN, emptyTally } from './windows.js'
import type { Tally } from './windows.js'
import { AGENT_NAMES } from './summary.js'
import type { AgentId, AgentSummary, SessionSummary, WindowSummary } from './summary.js'

// What the card reads out of an aiusage.state message.

export interface AiUsageState {
  agents: AgentSummary[]
  sessions: SessionSummary[]
  // The first scan of the logs is still running.
  scanning: boolean
  updatedAt: number
}

const AGENT_IDS: AgentId[] = ['claude', 'codex']

export function aiUsageStateOf(data: unknown): AiUsageState {
  const record = recordOf(data)
  return {
    agents: arrayOf(record.agents).flatMap(agentOf),
    sessions: arrayOf(record.sessions).flatMap(sessionOf),
    scanning: record.scanning === true,
    updatedAt: numberOf(record.updatedAt, 0),
  }
}

function agentIdOf(value: unknown): AgentId | null {
  const found = AGENT_IDS.find((id) => id === value)
  if (found === undefined) {
    return null
  }
  return found
}

function agentOf(record: Record<string, unknown>): AgentSummary[] {
  const id = agentIdOf(record.id)
  if (id === null) {
    return []
  }
  return [
    {
      id,
      name: AGENT_NAMES[id],
      status: stringOf(record.status),
      today: tallyOf(record.today),
      window: windowOf(record.window),
      weekly: windowOf(record.weekly),
      plan: stringOf(record.plan),
      hourly: hourlyOf(record.hourly),
    },
  ]
}

function tallyOf(value: unknown): Tally {
  const record = recordOf(value)
  return {
    ...emptyTally(),
    tokens: numberOf(record.tokens, 0),
    input: numberOf(record.input, 0),
    output: numberOf(record.output, 0),
    cacheWrite: numberOf(record.cacheWrite, 0),
    cacheRead: numberOf(record.cacheRead, 0),
    messages: numberOf(record.messages, 0),
  }
}

function windowOf(value: unknown): WindowSummary | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const record = recordOf(value)
  return {
    label: stringOf(record.label),
    percent: numberOf(record.percent, -1),
    tokens: numberOf(record.tokens, 0),
    limit: numberOf(record.limit, 0),
    resetsAt: numberOf(record.resetsAt, 0),
    active: record.active === true,
    source: stringOf(record.source),
  }
}

function hourlyOf(value: unknown): number[] {
  const hours = Array.from({ length: HOURS_SHOWN }, () => 0)
  if (!Array.isArray(value)) {
    return hours
  }
  return hours.map((_, index) => numberOf(value[index], 0))
}

function sessionOf(record: Record<string, unknown>): SessionSummary[] {
  const agent = agentIdOf(record.agent)
  const id = stringOf(record.id)
  if (agent === null || id === '') {
    return []
  }
  return [
    {
      id,
      agent,
      project: stringOf(record.project),
      branch: stringOf(record.branch),
      title: stringOf(record.title),
      model: stringOf(record.model),
      what: stringOf(record.what),
      status: sessionStatusOf(record.status),
      lastActivityAt: numberOf(record.lastActivityAt, 0),
      contextTokens: numberOf(record.contextTokens, 0),
    },
  ]
}

function sessionStatusOf(value: unknown): 'working' | 'idle' {
  if (value === 'working') {
    return 'working'
  }
  return 'idle'
}
