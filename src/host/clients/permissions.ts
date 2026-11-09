import { matchesPattern } from '../bus.js'

// What a client may do on the bus. A client never sees the bus itself: every
// request goes through the bridge, which checks it against these lists first.
// Patterns are the bus's own: exact, or a trailing "*" for any suffix.

export interface ClientPermissions {
  // Topics it may subscribe to. A request for a wider pattern than one listed
  // here is refused, not narrowed.
  subscribe: string[]
  // Commands it may call.
  call: string[]
  // Topics it may publish or retain.
  publish: string[]
  // Config keys it may read and `config:set` may write, as patterns. A client
  // with any may subscribe to `config`, and sees only these keys of it.
  configKeys: string[]
}

export const CONFIG_TOPIC = 'config'

export const NO_PERMISSIONS: ClientPermissions = { subscribe: [], call: [], publish: [], configKeys: [] }

export function maySubscribe(permissions: ClientPermissions, pattern: string): boolean {
  if (pattern === CONFIG_TOPIC && permissions.configKeys.length > 0) {
    return true
  }
  return permissions.subscribe.some((allowed) => covers(allowed, pattern))
}

/** The parts of a config snapshot under the keys the client may read. */
export function readableConfig(permissions: ClientPermissions, snapshot: unknown): Record<string, unknown> {
  const visible: Record<string, unknown> = {}
  for (const key of permissions.configKeys) {
    copyPath(snapshot, visible, pathOf(key))
  }
  return visible
}

// "weather.cards.*" and "weather.cards" both name the subtree at weather.cards.
function pathOf(key: string): string[] {
  const parts = key.split('.')
  if (parts[parts.length - 1] === '*') {
    parts.pop()
  }
  return parts
}

function copyPath(from: unknown, into: Record<string, unknown>, path: string[]): void {
  let source = from
  let target = into
  for (let index = 0; index < path.length; index++) {
    if (typeof source !== 'object' || source === null || !(path[index] in source)) {
      return
    }
    source = (source as Record<string, unknown>)[path[index]]
    if (index === path.length - 1) {
      target[path[index]] = source
      return
    }
    target = childObject(target, path[index])
  }
}

function childObject(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  const existing = parent[key]
  if (typeof existing === 'object' && existing !== null) {
    return existing as Record<string, unknown>
  }
  const created: Record<string, unknown> = {}
  parent[key] = created
  return created
}

export function mayPublish(permissions: ClientPermissions, type: string): boolean {
  return !type.includes('*') && permissions.publish.some((allowed) => matchesPattern(allowed, type))
}

export function mayCall(permissions: ClientPermissions, type: string, data: unknown): boolean {
  if (type.includes('*') || !permissions.call.some((allowed) => matchesPattern(allowed, type))) {
    return false
  }
  if (type !== 'config:set') {
    return true
  }
  return mayWriteConfig(permissions, data)
}

function mayWriteConfig(permissions: ClientPermissions, data: unknown): boolean {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  const key = (data as Record<string, unknown>).key
  if (typeof key !== 'string' || key.includes('*')) {
    return false
  }
  return permissions.configKeys.some((allowed) => matchesPattern(allowed, key))
}

// Whether everything `requested` matches is also matched by `allowed`.
function covers(allowed: string, requested: string): boolean {
  if (!allowed.endsWith('*')) {
    return allowed === requested
  }
  return requested.startsWith(allowed.slice(0, -1))
}
