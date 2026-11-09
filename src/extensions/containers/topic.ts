import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record.js'
import { NO_READING } from './parse.js'
import type { ContainerItem, Counts, Engine, ItemState } from './parse.js'

// What the card reads out of a containers.state message.

export interface EngineStatus {
  engine: Engine
  // ok | missing (the program is not installed) | error | disabled
  status: string
  message: string
  count: number
}

export interface ContainersState {
  items: ContainerItem[]
  counts: Counts
  engines: EngineStatus[]
  updatedAt: number
}

const ENGINES: Engine[] = ['docker', 'podman', 'kubernetes']
const STATES: ItemState[] = ['running', 'starting', 'unhealthy', 'failed', 'paused', 'stopped']

export function containersStateOf(data: unknown): ContainersState {
  const record = recordOf(data)
  const counts = recordOf(record.counts)
  return {
    items: arrayOf(record.items).flatMap(itemOf),
    counts: {
      running: numberOf(counts.running, 0),
      starting: numberOf(counts.starting, 0),
      unhealthy: numberOf(counts.unhealthy, 0),
      failed: numberOf(counts.failed, 0),
      paused: numberOf(counts.paused, 0),
      stopped: numberOf(counts.stopped, 0),
      total: numberOf(counts.total, 0),
    },
    engines: arrayOf(record.engines).flatMap(engineStatusOf),
    updatedAt: numberOf(record.updatedAt, 0),
  }
}

function itemOf(record: Record<string, unknown>): ContainerItem[] {
  const engine = engineOf(record.engine)
  const state = stateOf(record.state)
  const id = stringOf(record.id)
  if (engine === null || state === null || id === '') {
    return []
  }
  return [
    {
      id,
      engine,
      name: stringOf(record.name),
      group: stringOf(record.group),
      image: stringOf(record.image),
      state,
      detail: stringOf(record.detail),
      ports: stringOf(record.ports),
      cpu: numberOf(record.cpu, NO_READING),
      memory: stringOf(record.memory),
      restarts: numberOf(record.restarts, 0),
      ready: stringOf(record.ready),
      controllable: record.controllable === true,
    },
  ]
}

function engineStatusOf(record: Record<string, unknown>): EngineStatus[] {
  const engine = engineOf(record.engine)
  if (engine === null) {
    return []
  }
  return [
    {
      engine,
      status: stringOf(record.status),
      message: stringOf(record.message),
      count: numberOf(record.count, 0),
    },
  ]
}

function engineOf(value: unknown): Engine | null {
  const found = ENGINES.find((engine) => engine === value)
  if (found === undefined) {
    return null
  }
  return found
}

function stateOf(value: unknown): ItemState | null {
  const found = STATES.find((state) => state === value)
  if (found === undefined) {
    return null
  }
  return found
}

export const ENGINE_NAMES: Record<Engine, string> = {
  docker: 'Docker',
  podman: 'Podman',
  kubernetes: 'Kubernetes',
}

/** What to tell the user when no engine answered: the first failure, or that none is installed. */
export function engineProblemOf(engines: EngineStatus[]): string {
  const failed = engines.find((engine) => engine.status === 'error')
  if (failed === undefined) {
    return 'Neither Docker nor Podman is installed.'
  }
  return `${ENGINE_NAMES[failed.engine]}: ${failed.message}`
}

/** Nothing to show because every enabled engine is missing or failing. */
export function allEnginesDown(engines: EngineStatus[]): boolean {
  const enabled = engines.filter((engine) => engine.status !== 'disabled')
  return enabled.length > 0 && enabled.every((engine) => engine.status === 'error' || engine.status === 'missing')
}
