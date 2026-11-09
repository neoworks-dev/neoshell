<script lang="ts">
  import { List, ListRow, SectionHeader, SegmentedButton, TextField } from '@neoworks/gtk-ui'
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { Settings, valueAt } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import { arrayOf, recordOf, stringOf } from '../../lib/record'
  import WeatherCardSettings from './WeatherCardSettings.svelte'
  import type { PlacedCard } from './placed'

  // Settings → Weather: the location and units every card shows, and below
  // them each placed card, which can show a place and units of its own. A
  // location is applied a moment after typing stops, since each change costs
  // a geocoding request.

  const UNIT_OPTIONS = [
    { value: 'metric', label: '°C' },
    { value: 'imperial', label: '°F' },
  ]
  const PLACE_DEBOUNCE_MS = 700

  let { bus }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))

  let cards = $state<PlacedCard[]>([])
  let configLoaded = $state(false)
  let placeDraft = $state('')
  let applyTimer: ReturnType<typeof setTimeout> | undefined

  const defaultPlace = $derived(settings.string('weather.place', ''))
  const units = $derived(settings.string('weather.units', 'metric'))

  $effect(() => settings.connect())

  // The drafts start as what is configured, once; the cards' fields wait for
  // the same snapshot before they seed theirs.
  $effect(() =>
    subscribeTo(bus, 'config', (message) => {
      if (configLoaded) {
        return
      }
      configLoaded = true
      placeDraft = stringOf(valueAt(recordOf(message.data), 'weather.place'))
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'weather.cards', (message) => {
      cards = placedCardsOf(message.data)
    }),
  )

  $effect(() => () => clearTimeout(applyTimer))

  function placedCardsOf(data: unknown): PlacedCard[] {
    return arrayOf(recordOf(data).cards).map((card) => ({ id: stringOf(card.id), size: stringOf(card.size) }))
  }

  function applyPlace(): void {
    clearTimeout(applyTimer)
    settings.set('weather.place', placeDraft.trim())
  }

  function placeTyped(): void {
    clearTimeout(applyTimer)
    applyTimer = setTimeout(applyPlace, PLACE_DEBOUNCE_MS)
  }
</script>

<gtkbox class="settings-content" orientation="vertical" spacing={8}>
  <SectionHeader title="Weather" description="What the weather cards on the desktop show." level={3} />
  <TextField
    label="Location"
    placeholder="City"
    icon="mark-location-symbolic"
    bind:value={placeDraft}
    supportingText="Every card shows this place unless it has one of its own."
    oninput={placeTyped}
    onsubmit={applyPlace}
  />
  <List variant="card" dividers>
    <ListRow title="Units">
      {#snippet trailing()}
        <SegmentedButton
          label="Units"
          options={UNIT_OPTIONS}
          value={units}
          onchange={(value) => settings.set('weather.units', value)}
        />
      {/snippet}
    </ListRow>
  </List>

  {#if configLoaded && cards.length > 0}
    <SectionHeader title="Cards" description="The weather cards on your desktops." level={3} />
    {#each cards as card, index (card.id)}
      <WeatherCardSettings {settings} {card} number={index + 1} {defaultPlace} />
    {/each}
  {/if}
</gtkbox>
