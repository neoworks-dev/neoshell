import type { BusService } from '../lib/bus.js'
import { commandOf, sourceTopicOf, topicOf } from '../host/external/manifest.js'
import { startShellClient } from './runtime.js'

// What an installed program's widget bundle starts with. Its views get
// `source` besides the usual props: the program's own topics and calls by
// their plain names, which the shell carries as ext.<id>.* (see
// host/external). Nothing else on the bus is open to it.

export interface ExtensionSource {
  // The topic's value now and on every change.
  subscribe(topic: string, handler: (data: unknown) => void): () => void
  // Whether the program is on the bus; what it last sent stays while it is not.
  available(handler: (available: boolean) => void): () => void
  call(name: string, args?: unknown): Promise<unknown>
}

export function startExtensionClient(id: string, views: Record<string, unknown>): void {
  startShellClient(views, (bus) => ({ source: extensionSource(bus, id) }))
}

export function extensionSource(bus: BusService, id: string): ExtensionSource {
  return {
    subscribe: (topic, handler) => bus.subscribe(topicOf(id, topic), (message) => handler(message.data)),
    available: (handler) => bus.subscribe(sourceTopicOf(id), (message) => handler(isAvailable(message.data))),
    call: (name, args) => bus.call(commandOf(id, name), argsOf(args)),
  }
}

function isAvailable(data: unknown): boolean {
  return typeof data === 'object' && data !== null && (data as Record<string, unknown>).available === true
}

function argsOf(args: unknown): unknown {
  if (args === undefined) {
    return {}
  }
  return args
}
