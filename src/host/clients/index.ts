import type { Bus } from '../bus.js'
import { ClientManager } from './manager.js'
import type { ClientDeclaration } from './manager.js'

// The shell's one client manager. It is created at startup, before any view
// renders, and views reach it through clientManager() rather than a prop: a
// view that runs as a client is resolved from the registry like any other,
// and the registry does not know which ones those are.

export type { ClientDeclaration } from './manager.js'
export type { ClientPermissions } from './permissions.js'

let manager: ClientManager | null = null

export function startClients(bus: Bus, declarationOf: (name: string) => ClientDeclaration | undefined): () => void {
  manager = new ClientManager(bus, declarationOf)
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
