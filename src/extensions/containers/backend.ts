import type { Plugin } from '@neoworks/extension-system'
import { RetainedTopics, registerFunction } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { sectionOf } from '../../lib/config.js'
import { recordOf, stringOf } from '../../lib/record.js'
import { requireService } from '../../lib/services.js'
import { run } from '../../gjs/proc.js'
import type { CommandResult } from '../../gjs/proc.js'
import { failureOf } from './failure.js'
import { isAction, isEngineContainerId, kubePodsArgs, optionsOf } from './options.js'
import type { ContainersOptions } from './options.js'
import {
  countsOf,
  isUp,
  parseDockerPs,
  parseDockerStats,
  parseKubePods,
  parsePodmanPs,
  parsePodmanStats,
  sortedItems,
  visibleItems,
  withUsage,
} from './parse.js'
import type { ContainerItem, Engine } from './parse.js'
import type { EngineStatus } from './topic.js'

// containers: Docker and Podman containers and, when kubectl works, the pods
// of a Kubernetes context, as one retained topic. The engines' command-line
// tools are what is asked: they already know the socket, the context and the
// credentials, and they are the same answer the user would get in a terminal.
//
//   containers.state    {items, counts, engines: [{engine, status, message,
//                        count}], updatedAt}
//   containers:action   {engine, id, action: start|stop|restart} → {ok} | {error}
//   containers:refresh  {} → {ok}
//
// items are sorted needing-attention first and leave out stopped containers
// unless the settings ask for them; counts are over everything. An action
// only applies to a container the last poll listed, by the id it listed, and
// pods are read-only: a pod's restart is its controller's business.
//
// Settings come from the config topic's "containers" section:
//
//   "containers": {"engines": {"docker": true, "podman": true, "kubernetes": true},
//                  "kubeContext": "", "kubeNamespace": "", "allNamespaces": false,
//                  "showStopped": false, "pollSeconds": 10}

const COMMAND_TIMEOUT_SECONDS = '8'
const ACTION_TIMEOUT_SECONDS = '45'
const STOP_GRACE_SECONDS = '10'
const MAX_ITEMS = 80
const TICK_MS = 1000

interface EngineResult {
  items: ContainerItem[]
  status: EngineStatus
}

const containersExtension: Plugin.Object = {
  name: 'containers',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const topics = new RetainedTopics(bus)
    context.effect(() => () => topics.withdrawAll())
    const containers = new Containers(topics)
    context.effect(() =>
      bus.subscribe('config', (message) => {
        containers.configure(message.data)
      }),
    )
    registerFunction(context, bus, 'containers:action', (data) => containers.act(data))
    registerFunction(context, bus, 'containers:refresh', () => containers.refreshNow())
    context.effect(() => {
      const timer = setInterval(() => void containers.tick(), TICK_MS)
      return () => {
        clearInterval(timer)
      }
    })
  },
}

export default containersExtension

class Containers {
  private readonly topics: RetainedTopics
  private options = optionsOf({})
  private optionsSignature = JSON.stringify(this.options)
  private items: ContainerItem[] = []
  private lastRefresh = 0
  private refreshing = false
  private stale = true

  constructor(topics: RetainedTopics) {
    this.topics = topics
  }

  // A change to what is asked of the engines is worth asking again for now.
  configure(snapshot: unknown): void {
    this.options = optionsOf(sectionOf(snapshot, 'containers'))
    const signature = JSON.stringify(this.options)
    if (signature === this.optionsSignature) {
      return
    }
    this.optionsSignature = signature
    this.stale = true
  }

  async tick(): Promise<void> {
    const due = Date.now() - this.lastRefresh >= this.options.pollSeconds * 1000
    if (this.refreshing || !(due || this.stale)) {
      return
    }
    await this.refresh()
  }

  async refreshNow(): Promise<Record<string, unknown>> {
    await this.refresh()
    return { ok: true }
  }

  async act(data: unknown): Promise<Record<string, unknown>> {
    const request = recordOf(data)
    const id = stringOf(request.id)
    const engine = stringOf(request.engine)
    const action = request.action
    const item = this.items.find((candidate) => candidate.id === id && candidate.engine === engine)
    if (item === undefined || !item.controllable || !isEngineContainerId(id) || !isAction(action)) {
      return { error: 'That container is not available.' }
    }
    const result = await run(actionCommand(item.engine, action, id))
    await this.refresh()
    if (!result.ok) {
      return { error: failureOf(result.stderr).message }
    }
    return { ok: true }
  }

  private async refresh(): Promise<void> {
    this.refreshing = true
    this.stale = false
    const options = this.options
    try {
      const results = await Promise.all([
        engineResult('docker', options.docker, () => pollDocker('docker')),
        engineResult('podman', options.podman, () => pollDocker('podman')),
        engineResult('kubernetes', options.kubernetes, () => pollKube(options)),
      ])
      this.publish(results, options)
    } finally {
      this.lastRefresh = Date.now()
      this.refreshing = false
    }
  }

  private publish(results: EngineResult[], options: ContainersOptions): void {
    const all = results.flatMap((result) => result.items)
    this.items = all
    this.topics.set('containers.state', {
      items: sortedItems(visibleItems(all, options.showStopped)).slice(0, MAX_ITEMS),
      counts: countsOf(all),
      engines: results.map((result) => result.status),
      updatedAt: Date.now(),
    })
  }
}

async function engineResult(
  engine: Engine,
  enabled: boolean,
  poll: () => Promise<EngineResult>,
): Promise<EngineResult> {
  if (!enabled) {
    return { items: [], status: { engine, status: 'disabled', message: '', count: 0 } }
  }
  return poll()
}

async function pollDocker(binary: 'docker' | 'podman'): Promise<EngineResult> {
  const listed = await run(withTimeout(listCommand(binary)))
  if (!listed.ok) {
    return failedResult(binary, listed)
  }
  const items = parsePsOutput(binary, listed.stdout)
  const withReadings = await addUsage(binary, items)
  return { items: withReadings, status: { engine: binary, status: 'ok', message: '', count: items.length } }
}

function listCommand(binary: 'docker' | 'podman'): string[] {
  if (binary === 'docker') {
    return ['docker', 'ps', '-a', '--format', '{{json .}}']
  }
  return ['podman', 'ps', '-a', '--format', 'json']
}

function parsePsOutput(binary: 'docker' | 'podman', text: string): ContainerItem[] {
  if (binary === 'docker') {
    return parseDockerPs(text, 'docker')
  }
  return parsePodmanPs(text)
}

// Usage is a second, slower call, and only worth making when something runs.
async function addUsage(binary: 'docker' | 'podman', items: ContainerItem[]): Promise<ContainerItem[]> {
  if (!items.some((item) => isUp(item.state))) {
    return items
  }
  const stats = await run(withTimeout(statsCommand(binary)))
  if (!stats.ok) {
    return items
  }
  if (binary === 'docker') {
    return withUsage(items, parseDockerStats(stats.stdout))
  }
  return withUsage(items, parsePodmanStats(stats.stdout))
}

function statsCommand(binary: 'docker' | 'podman'): string[] {
  if (binary === 'docker') {
    return ['docker', 'stats', '--no-stream', '--format', '{{json .}}']
  }
  return ['podman', 'stats', '--no-stream', '--format', 'json']
}

async function pollKube(options: ContainersOptions): Promise<EngineResult> {
  const listed = await run(withTimeout(kubePodsArgs(options)))
  if (!listed.ok) {
    return failedResult('kubernetes', listed)
  }
  const items = parseKubePods(listed.stdout)
  return { items, status: { engine: 'kubernetes', status: 'ok', message: '', count: items.length } }
}

function failedResult(engine: Engine, result: CommandResult): EngineResult {
  const failure = failureOf(result.stderr)
  return { items: [], status: { engine, status: failure.kind, message: failure.message, count: 0 } }
}

function binaryOf(engine: Engine): string {
  if (engine === 'podman') {
    return 'podman'
  }
  return 'docker'
}

function withTimeout(command: string[]): string[] {
  return ['timeout', COMMAND_TIMEOUT_SECONDS, ...command]
}

function actionCommand(engine: Engine, action: string, id: string): string[] {
  const command = [binaryOf(engine), action]
  if (action !== 'start') {
    command.push('--time', STOP_GRACE_SECONDS)
  }
  command.push(id)
  return ['timeout', ACTION_TIMEOUT_SECONDS, ...command]
}
