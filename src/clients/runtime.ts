import { sendApp, startClient } from '@neoworks/svelte-gtk4/client'
import { RemoteBus } from '../lib/remoteBus.js'
import type { BusAnswer, BusRequest } from '../lib/remoteBus.js'

// What every shell client's entry calls: its views by name, each mounted with
// the props a view in the shell gets. The bus is the client's connection to
// the host's; the registry is an empty one, since a client renders no views
// but its own.

const emptyRegistry = {
  resolve: () => undefined,
  onChange: () => () => {},
  register: () => () => {},
}

export function startShellClient(views: Record<string, unknown>): void {
  const bus = new RemoteBus((request: BusRequest) => sendApp(request))
  startClient(views, {
    props: () => ({ bus, registry: emptyRegistry }),
    onApp: (data) => bus.receive(data as BusAnswer),
  })
}
