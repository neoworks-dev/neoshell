import { matchesPattern } from '../bus.js'

// What a client may do on the bus. A client never sees the bus itself: every
// request goes through the bridge, which checks it against these lists first.
// Patterns are the bus's own: exact, or a trailing "*" for any suffix.

export interface ClientPermissions {
  // Topics it may subscribe to. A request for a wider pattern than one listed
  // here is refused, not narrowed.
  subscribe: string[]
  // Commands it may call: by name, or by name with the only values some of
  // the request's fields may take.
  call: (string | CallRule)[]
  // Topics it may publish or retain.
  publish: string[]
  // Config keys it may read and `config:set` may write, as patterns. A client
  // with any may subscribe to `config`, and sees only these keys of it.
  configKeys: string[]
  // View types it may embed with <gtkembed>: the bus's patterns, or a
  // leading "*" for any prefix — "*.icon" is every extension's icon view.
  embed?: string[]
}

// { type: 'hypr:dispatch', fields: { dispatcher: ['workspace'] } }: the
// command, and only with those dispatchers.
export interface CallRule {
  type: string
  fields: Record<string, string[]>
}

export const CONFIG_TOPIC = 'config'

export const NO_PERMISSIONS: ClientPermissions = { subscribe: [], call: [], publish: [], configKeys: [] }

export function mayEmbed(permissions: ClientPermissions, view: string): boolean {
  if (permissions.embed === undefined || view.includes('*')) {
    return false
  }
  return permissions.embed.some((allowed) => matchesViewPattern(allowed, view))
}

function matchesViewPattern(allowed: string, view: string): boolean {
  if (!allowed.startsWith('*')) {
    return matchesPattern(allowed, view)
  }
  const suffix = allowed.slice(1)
  return view.length > suffix.length && view.endsWith(suffix)
}

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
  if (type.includes('*') || !permissions.call.some((allowed) => allowsCall(allowed, type, data))) {
    return false
  }
  if (type !== 'config:set') {
    return true
  }
  return mayWriteConfig(permissions, data)
}

function allowsCall(allowed: string | CallRule, type: string, data: unknown): boolean {
  if (typeof allowed === 'string') {
    return matchesPattern(allowed, type)
  }
  if (!matchesPattern(allowed.type, type)) {
    return false
  }
  const record = recordOf(data)
  return Object.entries(allowed.fields).every(([field, values]) => values.includes(String(record[field])))
}

function recordOf(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {}
  }
  return value as Record<string, unknown>
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
