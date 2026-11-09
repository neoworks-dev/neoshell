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
  // Config keys `config:set` may write, as patterns.
  configKeys: string[]
}

export const NO_PERMISSIONS: ClientPermissions = { subscribe: [], call: [], publish: [], configKeys: [] }

export function maySubscribe(permissions: ClientPermissions, pattern: string): boolean {
  return permissions.subscribe.some((allowed) => covers(allowed, pattern))
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
