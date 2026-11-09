import { sendApp, startClient } from '@neoworks/svelte-gtk4/client'
import { RemoteBus } from '../lib/remoteBus.js'
import type { BusAnswer, BusRequest } from '../lib/remoteBus.js'
import type { LocaleProfile } from '../lib/localeProfile.js'
import { installDateTimeFormat, setLocaleProfile } from './intl.js'
import { clientRegistry } from './registry.js'

// What every shell client's entry calls: its views by name, each mounted with
// the props a view in the shell gets. The bus is the client's connection to
// the host's; the registry answers every type with an embed of the host's
// view (registry.ts). The host's first message is its locale, for the
// Intl.DateTimeFormat views format with.

// Installed while this module evaluates, before the views' modules do: some
// build their formats at the top level.
installDateTimeFormat()

export interface ClientGreeting {
  locale: LocaleProfile
}

// `extraProps` adds to what every view gets, from the client's bus.
export function startShellClient(
  views: Record<string, unknown>,
  extraProps: (bus: RemoteBus) => Record<string, unknown> = () => ({}),
): void {
  const bus = new RemoteBus((request: BusRequest) => sendApp(request))
  const extra = extraProps(bus)
  startClient(views, {
    props: () => ({ ...extra, bus, registry: clientRegistry }),
    onApp: (data) => receive(bus, data),
  })
}

function receive(bus: RemoteBus, data: unknown): void {
  if (isGreeting(data)) {
    setLocaleProfile(data.locale)
    return
  }
  bus.receive(data as BusAnswer)
}

function isGreeting(data: unknown): data is ClientGreeting {
  return typeof data === 'object' && data !== null && 'locale' in data
}
