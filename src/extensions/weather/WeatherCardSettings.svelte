<script lang="ts">
  import { List, ListRow, SectionHeader, SegmentedButton, TextField } from '@neoworks/gtk-ui'
  import { untrack } from 'svelte'
  import type { Settings } from '../../lib/settings.svelte'
  import type { PlacedCard } from './placed'

  // One placed card's own place and units, under weather.cards.<id>. Empty
  // follows the defaults above it, which is what the backend makes of an
  // empty string.

  const UNIT_OPTIONS = [
    { value: '', label: 'Default' },
    { value: 'metric', label: '°C' },
    { value: 'imperial', label: '°F' },
  ]
  const PLACE_DEBOUNCE_MS = 700

  let {
    settings,
    card,
    number,
    defaultPlace,
  }: { settings: Settings; card: PlacedCard; number: number; defaultPlace: string } = $props()

  const key = $derived(`weather.cards.${card.id}`)
  const units = $derived(settings.string(`${key}.units`, ''))

  // Seeded once: a config republish mid-typing must not overwrite the draft.
  let placeDraft = $state(untrack(() => settings.string(`${key}.place`, '')))
  let applyTimer: ReturnType<typeof setTimeout> | undefined

  $effect(() => () => clearTimeout(applyTimer))

  function applyPlace(): void {
    clearTimeout(applyTimer)
    settings.set(`${key}.place`, placeDraft.trim())
  }

  function placeTyped(): void {
    clearTimeout(applyTimer)
    applyTimer = setTimeout(applyPlace, PLACE_DEBOUNCE_MS)
  }

  function titleOf(size: string, position: number): string {
    return `${size.charAt(0).toUpperCase()}${size.slice(1)} card ${position}`
  }

  function placePlaceholder(fallback: string): string {
    if (fallback === '') {
      return 'Default location'
    }
    return `Default (${fallback})`
  }
</script>

<gtkbox orientation="vertical" spacing={8}>
  <SectionHeader title={titleOf(card.size, number)} level={4} />
  <List variant="card" dividers>
    <ListRow title="Location" subtitle="Empty shows the default location">
      {#snippet trailing()}
        <gtkbox css="min-width: 220px;">
          <TextField
            label="Location"
            hideLabel
            placeholder={placePlaceholder(defaultPlace)}
            icon="mark-location-symbolic"
            bind:value={placeDraft}
            oninput={placeTyped}
            onsubmit={applyPlace}
          />
        </gtkbox>
      {/snippet}
    </ListRow>
    <ListRow title="Units">
      {#snippet trailing()}
        <SegmentedButton
          label="Units"
          options={UNIT_OPTIONS}
          value={units}
          onchange={(value) => settings.set(`${key}.units`, value)}
        />
      {/snippet}
    </ListRow>
  </List>
</gtkbox>
