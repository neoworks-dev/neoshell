import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record.js'

// What the container engines print, turned into one list of items. Pure: the
// backend runs the commands, this reads what they said.

export type Engine = 'docker' | 'podman' | 'kubernetes'

// running: up and, where the engine checks, healthy. starting: coming up, or
// restarting. unhealthy: up but failing its health check. failed: stopped with
// an error, or a pod that cannot start. paused, stopped: as it says.
export type ItemState = 'running' | 'starting' | 'unhealthy' | 'failed' | 'paused' | 'stopped'

export interface ContainerItem {
  id: string
  engine: Engine
  name: string
  // The compose project, or the pod's namespace.
  group: string
  image: string
  state: ItemState
  detail: string
  ports: string
  // Percent of one core as the engine reports it; -1 when unknown.
  cpu: number
  memory: string
  restarts: number
  // "1/2" for a pod's ready containers; empty for a container.
  ready: string
  // Whether start, stop and restart apply.
  controllable: boolean
}

export const NO_READING = -1

const NORMAL_EXIT_CODES = new Set([0, 137, 143])
const HEALTH_PATTERN = /\((healthy|unhealthy|health: starting)\)/
const EXIT_PATTERN = /^Exited \((\d+)\)/
const COMPOSE_PROJECT_PATTERN = /(?:^|,)com\.docker\.compose\.project=([^,]*)/
const PUBLISHED_PORT_PATTERN = /(?:[\d.]+|\[[^\]]*\]):(\d+)(?:-\d+)?->/g

const STATE_ORDER: Record<ItemState, number> = {
  failed: 0,
  unhealthy: 1,
  starting: 2,
  running: 3,
  paused: 4,
  stopped: 5,
}

const KUBE_FAILURE_REASONS = new Set([
  'CrashLoopBackOff',
  'Error',
  'ErrImagePull',
  'ImagePullBackOff',
  'CreateContainerConfigError',
  'CreateContainerError',
  'InvalidImageName',
  'OOMKilled',
  'RunContainerError',
  'Evicted',
])

export function parseDockerPs(text: string, engine: Engine): ContainerItem[] {
  return linesOf(text).flatMap((line) => dockerItemOf(line, engine))
}

function dockerItemOf(line: string, engine: Engine): ContainerItem[] {
  const record = recordOfJson(line)
  const id = stringOf(record.ID)
  if (id === '') {
    return []
  }
  const status = stringOf(record.Status)
  return [
    {
      id,
      engine,
      name: firstName(stringOf(record.Names)),
      group: composeProjectOf(stringOf(record.Labels)),
      image: stringOf(record.Image),
      state: dockerStateOf(stringOf(record.State), healthOf(stringOf(record.HealthStatus), status), status),
      detail: status,
      ports: publishedPortsOf(stringOf(record.Ports)),
      cpu: NO_READING,
      memory: '',
      restarts: 0,
      ready: '',
      controllable: true,
    },
  ]
}

/** `podman ps -a --format json`: one array rather than a line per container. */
export function parsePodmanPs(text: string): ContainerItem[] {
  return arrayOf(jsonOf(text)).flatMap(podmanItemOf)
}

function podmanItemOf(record: Record<string, unknown>): ContainerItem[] {
  const id = stringOf(record.Id).slice(0, 12)
  if (id === '') {
    return []
  }
  const status = podmanStatusOf(record)
  return [
    {
      id,
      engine: 'podman',
      name: podmanNameOf(record.Names),
      group: stringOf(recordOf(record.Labels)['com.docker.compose.project']),
      image: stringOf(record.Image),
      state: dockerStateOf(stringOf(record.State), healthOf('', status), status),
      detail: status,
      ports: podmanPortsOf(record.Ports),
      cpu: NO_READING,
      memory: '',
      restarts: 0,
      ready: '',
      controllable: true,
    },
  ]
}

// Podman's own Status is absent on some versions; the exit code carries the
// part that matters then.
function podmanStatusOf(record: Record<string, unknown>): string {
  const status = stringOf(record.Status)
  if (status !== '') {
    return status
  }
  if (stringOf(record.State) === 'exited') {
    return `Exited (${numberOf(record.ExitCode, 0)})`
  }
  return stringOf(record.State)
}

function podmanNameOf(names: unknown): string {
  if (Array.isArray(names) && typeof names[0] === 'string') {
    return names[0]
  }
  return ''
}

function podmanPortsOf(ports: unknown): string {
  const published = arrayOf(ports)
    .map((port) => numberOf(port.host_port, 0))
    .filter((port) => port > 0)
  return [...new Set(published)].map((port) => `:${port}`).join(' ')
}

function firstName(names: string): string {
  return names.split(',')[0].trim()
}

function composeProjectOf(labels: string): string {
  const match = COMPOSE_PROJECT_PATTERN.exec(labels)
  if (match === null) {
    return ''
  }
  return match[1]
}

/** The host ports a "0.0.0.0:8080->80/tcp, [::]:8080->80/tcp" column publishes, once each. */
export function publishedPortsOf(ports: string): string {
  const seen = new Set<string>()
  for (const match of ports.matchAll(PUBLISHED_PORT_PATTERN)) {
    seen.add(`:${match[1]}`)
  }
  return [...seen].join(' ')
}

function healthOf(healthStatus: string, status: string): string {
  if (healthStatus === 'healthy' || healthStatus === 'unhealthy' || healthStatus === 'starting') {
    return healthStatus
  }
  const match = HEALTH_PATTERN.exec(status)
  if (match === null) {
    return 'none'
  }
  if (match[1] === 'health: starting') {
    return 'starting'
  }
  return match[1]
}

export function dockerStateOf(state: string, health: string, status: string): ItemState {
  if (state === 'running') {
    return runningStateOf(health)
  }
  if (state === 'restarting' || state === 'removing') {
    return 'starting'
  }
  if (state === 'paused') {
    return 'paused'
  }
  if (state === 'dead') {
    return 'failed'
  }
  if (state === 'exited') {
    return exitedStateOf(status)
  }
  return 'stopped'
}

function runningStateOf(health: string): ItemState {
  if (health === 'unhealthy') {
    return 'unhealthy'
  }
  if (health === 'starting') {
    return 'starting'
  }
  return 'running'
}

function exitedStateOf(status: string): ItemState {
  const match = EXIT_PATTERN.exec(status)
  if (match === null || NORMAL_EXIT_CODES.has(Number(match[1]))) {
    return 'stopped'
  }
  return 'failed'
}

export interface UsageReading {
  cpu: number
  memory: string
}

/** `docker stats --no-stream --format '{{json .}}'`, keyed by the container's short id and by its name. */
export function parseDockerStats(text: string): Map<string, UsageReading> {
  const readings = new Map<string, UsageReading>()
  for (const line of linesOf(text)) {
    addDockerReading(readings, recordOfJson(line))
  }
  return readings
}

function addDockerReading(readings: Map<string, UsageReading>, record: Record<string, unknown>): void {
  const reading = {
    cpu: percentOf(stringOf(record.CPUPerc)),
    memory: usedMemoryOf(stringOf(record.MemUsage)),
  }
  addReading(readings, stringOf(record.ID), reading)
  addReading(readings, stringOf(record.Name), reading)
}

/** `podman stats --no-stream --format json`. */
export function parsePodmanStats(text: string): Map<string, UsageReading> {
  const readings = new Map<string, UsageReading>()
  for (const record of arrayOf(jsonOf(text))) {
    const reading = {
      cpu: percentOf(stringOf(record.cpu_percent)),
      memory: usedMemoryOf(stringOf(record.mem_usage)),
    }
    addReading(readings, stringOf(record.id).slice(0, 12), reading)
    addReading(readings, stringOf(record.name), reading)
  }
  return readings
}

function addReading(readings: Map<string, UsageReading>, key: string, reading: UsageReading): void {
  if (key !== '') {
    readings.set(key, reading)
  }
}

function percentOf(text: string): number {
  const value = Number.parseFloat(text)
  if (Number.isNaN(value)) {
    return NO_READING
  }
  return value
}

function usedMemoryOf(usage: string): string {
  return usage.split('/')[0].trim()
}

export function withUsage(items: ContainerItem[], readings: Map<string, UsageReading>): ContainerItem[] {
  return items.map((item) => {
    const reading = readingOf(readings, item)
    if (reading === undefined || item.state === 'stopped' || item.state === 'failed') {
      return item
    }
    return { ...item, cpu: reading.cpu, memory: reading.memory }
  })
}

function readingOf(readings: Map<string, UsageReading>, item: ContainerItem): UsageReading | undefined {
  const byId = readings.get(item.id)
  if (byId !== undefined) {
    return byId
  }
  return readings.get(item.name)
}

/** `kubectl get pods -o json`. */
export function parseKubePods(text: string): ContainerItem[] {
  return arrayOf(recordOf(jsonOf(text)).items).flatMap(podItemOf)
}

function podItemOf(pod: Record<string, unknown>): ContainerItem[] {
  const metadata = recordOf(pod.metadata)
  const name = stringOf(metadata.name)
  if (name === '') {
    return []
  }
  const namespace = stringOf(metadata.namespace)
  const containers = arrayOf(recordOf(pod.status).containerStatuses)
  const reason = podReasonOf(pod, containers)
  return [
    {
      id: `${namespace}/${name}`,
      engine: 'kubernetes',
      name,
      group: namespace,
      image: podImageOf(pod),
      state: podStateOf(pod, containers, reason),
      detail: reason,
      ports: '',
      cpu: NO_READING,
      memory: '',
      restarts: containers.reduce((total, container) => total + numberOf(container.restartCount, 0), 0),
      ready: `${containers.filter((container) => container.ready === true).length}/${containerCountOf(pod, containers)}`,
      controllable: false,
    },
  ]
}

function containerCountOf(pod: Record<string, unknown>, containers: Record<string, unknown>[]): number {
  const declared = arrayOf(recordOf(pod.spec).containers).length
  return Math.max(declared, containers.length)
}

function podImageOf(pod: Record<string, unknown>): string {
  const first = arrayOf(recordOf(pod.spec).containers)[0]
  if (first === undefined) {
    return ''
  }
  return stringOf(first.image)
}

// What `kubectl get pods` prints in STATUS: a waiting or terminated reason
// beats the phase, and a deletion in progress beats both.
export function podReasonOf(pod: Record<string, unknown>, containers: Record<string, unknown>[]): string {
  if (recordOf(pod.metadata).deletionTimestamp !== undefined) {
    return 'Terminating'
  }
  for (const container of containers) {
    const reason = containerReasonOf(recordOf(container.state))
    if (reason !== '') {
      return reason
    }
  }
  const status = recordOf(pod.status)
  const reason = stringOf(status.reason)
  if (reason !== '') {
    return reason
  }
  return stringOf(status.phase)
}

function containerReasonOf(state: Record<string, unknown>): string {
  const waiting = stringOf(recordOf(state.waiting).reason)
  if (waiting !== '') {
    return waiting
  }
  const terminated = recordOf(state.terminated)
  if (terminated.exitCode !== undefined && terminated.exitCode !== 0) {
    return stringOf(terminated.reason)
  }
  return ''
}

function podStateOf(
  pod: Record<string, unknown>,
  containers: Record<string, unknown>[],
  reason: string,
): ItemState {
  if (reason === 'Terminating') {
    return 'starting'
  }
  if (KUBE_FAILURE_REASONS.has(reason)) {
    return 'failed'
  }
  const phase = stringOf(recordOf(pod.status).phase)
  if (phase === 'Failed') {
    return 'failed'
  }
  if (phase === 'Succeeded') {
    return 'stopped'
  }
  if (phase === 'Running' && containers.length > 0 && containers.every((container) => container.ready === true)) {
    return 'running'
  }
  return 'starting'
}

/** Items to show: needs attention first, then by name. */
export function sortedItems(items: ContainerItem[]): ContainerItem[] {
  return [...items].sort((first, second) => {
    const byState = STATE_ORDER[first.state] - STATE_ORDER[second.state]
    if (byState !== 0) {
      return byState
    }
    return first.name.localeCompare(second.name)
  })
}

export function visibleItems(items: ContainerItem[], showStopped: boolean): ContainerItem[] {
  if (showStopped) {
    return items
  }
  return items.filter((item) => item.state !== 'stopped')
}

export interface Counts {
  running: number
  starting: number
  unhealthy: number
  failed: number
  paused: number
  stopped: number
  total: number
}

export function countsOf(items: ContainerItem[]): Counts {
  const counts: Counts = { running: 0, starting: 0, unhealthy: 0, failed: 0, paused: 0, stopped: 0, total: items.length }
  for (const item of items) {
    counts[item.state] += 1
  }
  return counts
}

/** The status dot's tone: success, warning, error or neutral, as the stylesheet's `tone-*` classes spell it. */
export function toneOf(state: ItemState): string {
  if (state === 'running') {
    return 'success'
  }
  if (state === 'starting' || state === 'paused') {
    return 'warning'
  }
  if (state === 'unhealthy' || state === 'failed') {
    return 'error'
  }
  return 'neutral'
}

export function isUp(state: ItemState): boolean {
  return state === 'running' || state === 'starting' || state === 'unhealthy'
}

function linesOf(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

function recordOfJson(text: string): Record<string, unknown> {
  return recordOf(jsonOf(text))
}

function jsonOf(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
