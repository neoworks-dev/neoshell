import type { Bus } from '../bus.js'
import type { ViewRegistry } from '../plugins/views.js'
import { ClientManager } from './manager.js'
import type { ClientDeclaration } from './manager.js'

// The shell's one client manager. It is created at startup, before any view
// renders, and views reach it through clientManager() rather than a prop: a
// view that runs as a client is resolved from the registry like any other,
// and the registry does not know which ones those are.

export type { ClientDeclaration } from './manager.js'
export type { ClientPermissions } from './permissions.js'

let manager: ClientManager | null = null

export function startClients(
  bus: Bus,
  registry: ViewRegistry,
  declarationOf: (name: string) => ClientDeclaration | undefined,
): () => void {
  manager = new ClientManager(bus, registry, declarationOf)
  return () => {
    if (manager !== null) {
      manager.stopAll()
    }
    manager = null
  }
}

export function clientManager(): ClientManager | null {
  return manager
}

// A client is named after its extension, "weather", or after the extension
// and one of its several clients, "neoshell-bar".
export function clientNameParts(name: string): { extension: string; part: string } {
  const dash = name.indexOf('-')
  if (dash < 0) {
    return { extension: name, part: '' }
  }
  return { extension: name.slice(0, dash), part: name.slice(dash + 1) }
}
