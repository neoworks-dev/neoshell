<script lang="ts">
  import { Card, ListRow, SectionHeader, Select } from '@neoworks/gtk-ui'
  import type { SelectOption } from '@neoworks/gtk-ui'
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { Displays } from '../../lib/displays.svelte'
  import type { Display } from '../../lib/displays.svelte'
  import {
    DISPLAYS_KEY,
    EVERY_DISPLAY,
    MAIN_DISPLAY,
    mainConnectorOf,
    placementOf,
  } from '../../lib/placement'
  import { recordOf, stringOf } from '../../lib/record'
  import { Settings } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import { idOf, isDetached, nodesOf } from '../../tree'

  // Settings → Displays: which monitor is the main one, and where each surface
  // of the view tree goes (lib/placement.ts). Detached nodes — the lock screen,
  // this window — place themselves and are not listed.

  interface Surface {
    id: string
    label: string
    args: Record<string, unknown>
  }

  let { bus }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))
  const displays = new Displays()

  let surfaces = $state<Surface[]>([])

  const section = $derived(recordOf(settings.value(DISPLAYS_KEY)))
  const main = $derived(mainConnectorOf(section, displays.connectors()))
  const mainOptions = $derived(displays.list.map(displayOption))
  const placementOptions = $derived([
    { value: EVERY_DISPLAY, label: 'Every display' },
    { value: MAIN_DISPLAY, label: 'Main display' },
    ...mainOptions,
  ])

  $effect(() => settings.connect())
  $effect(() => displays.connect())

  $effect(() =>
    subscribeTo(bus, 'views', (message) => {
      surfaces = surfacesOf(message.data)
    }),
  )

  function surfacesOf(data: unknown): Surface[] {
    const placed = nodesOf(data).filter((node) => idOf(node) !== '' && !isDetached(recordOf(node.args)))
    return placed.map((node) => {
      const args = recordOf(node.args)
      return { id: idOf(node), label: labelOf(args, idOf(node)), args }
    })
  }

  function labelOf(args: Record<string, unknown>, fallback: string): string {
    const label = stringOf(args.label)
    if (label === '') {
      return fallback
    }
    return label
  }

  function displayOption(display: Display): SelectOption {
    if (display.description === '') {
      return { value: display.connector, label: display.connector }
    }
    return { value: display.connector, label: `${display.connector} — ${display.description}` }
  }

  function setMain(connector: string): void {
    settings.set(`${DISPLAYS_KEY}.main`, connector)
  }

  function place(surface: Surface, placement: string): void {
    settings.set(`${DISPLAYS_KEY}.surfaces.${surface.id}`, placement)
  }
</script>

<gtkbox class="settings-content" orientation="vertical" spacing={20}>
  <SectionHeader
    title="Main display"
    description="Surfaces set to the main display go here, and so do the desktop's icons."
    level={4}
  />
  <Card padding="none">
    <ListRow title="Main display">
      {#snippet trailing()}
        <Select options={mainOptions} value={main} size="sm" onChange={setMain} />
      {/snippet}
    </ListRow>
  </Card>

  <SectionHeader
    title="Surfaces"
    description="A surface on a display that is unplugged moves to the main display."
    level={4}
  />
  <Card padding="none">
    {#each surfaces as surface (surface.id)}
      <ListRow title={surface.label}>
        {#snippet trailing()}
          <Select
            options={placementOptions}
            value={placementOf(section, surface.id, surface.args)}
            size="sm"
            onChange={(placement) => place(surface, placement)}
          />
        {/snippet}
      </ListRow>
    {/each}
  </Card>
</gtkbox>
