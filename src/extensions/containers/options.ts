import { numberOf, recordOf, stringOf } from '../../lib/record.js'

// The "containers" section of the config, and the commands it leads to.

export interface ContainersOptions {
  docker: boolean
  podman: boolean
  kubernetes: boolean
  // Empty: the current context / that context's namespace.
  kubeContext: string
  kubeNamespace: string
  allNamespaces: boolean
  showStopped: boolean
  pollSeconds: number
}

export const DEFAULT_POLL_SECONDS = 10
export const MIN_POLL_SECONDS = 3
export const MAX_POLL_SECONDS = 300

// What a context or namespace name may contain; anything else is not passed to
// kubectl at all.
const KUBE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,252}$/
const ENGINE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/
const POD_ID_PATTERN = /^[a-z0-9][a-z0-9.-]{0,62}\/[a-z0-9][a-z0-9.-]{0,252}$/

export function optionsOf(section: Record<string, unknown>): ContainersOptions {
  const engines = recordOf(section.engines)
  return {
    docker: flagOf(engines.docker, true),
    podman: flagOf(engines.podman, true),
    kubernetes: flagOf(engines.kubernetes, true),
    kubeContext: kubeNameOf(section.kubeContext),
    kubeNamespace: kubeNameOf(section.kubeNamespace),
    allNamespaces: flagOf(section.allNamespaces, false),
    showStopped: flagOf(section.showStopped, false),
    pollSeconds: Math.min(MAX_POLL_SECONDS, Math.max(MIN_POLL_SECONDS, numberOf(section.pollSeconds, DEFAULT_POLL_SECONDS))),
  }
}

function flagOf(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  return fallback
}

function kubeNameOf(value: unknown): string {
  const name = stringOf(value).trim()
  if (KUBE_NAME_PATTERN.test(name)) {
    return name
  }
  return ''
}

/** `kubectl get pods`, scoped by the options. Flags are joined to their values so a name cannot be read as an option. */
export function kubePodsArgs(options: ContainersOptions): string[] {
  const args = ['kubectl']
  if (options.kubeContext !== '') {
    args.push(`--context=${options.kubeContext}`)
  }
  args.push('--request-timeout=5s', 'get', 'pods', '-o', 'json')
  if (options.allNamespaces) {
    args.push('--all-namespaces')
    return args
  }
  if (options.kubeNamespace !== '') {
    args.push(`--namespace=${options.kubeNamespace}`)
  }
  return args
}

export function isEngineContainerId(id: string): boolean {
  return ENGINE_ID_PATTERN.test(id)
}

export function isPodId(id: string): boolean {
  return POD_ID_PATTERN.test(id)
}

export const ACTIONS = ['start', 'stop', 'restart']

export function isAction(action: unknown): action is string {
  return typeof action === 'string' && ACTIONS.includes(action)
}
