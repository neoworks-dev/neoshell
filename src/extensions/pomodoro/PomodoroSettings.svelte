<script lang="ts">
  import { IconButton, List, ListRow, Select } from '@neoworks/gtk-ui'
  import { untrack } from 'svelte'
  import { Settings } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import { SILENT, SOUND_OPTIONS, soundIdOf } from './sounds'

  // Settings → Pomodoro: the sound played when the timer reaches zero.

  const PREVIEW_TIMEOUT_MS = 2000

  let { bus }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))

  const sound = $derived(soundIdOf(settings.value('pomodoro.sound')))

  $effect(() => settings.connect())

  function choose(value: string): void {
    settings.set('pomodoro.sound', value)
    preview(value)
  }

  function preview(value: string): void {
    bus.call('pomodoro:preview', { sound: value }, PREVIEW_TIMEOUT_MS).catch((error: unknown) => {
      console.error('pomodoro: preview failed:', error)
    })
  }
</script>

<gtkbox class="settings-content" orientation="vertical" spacing={8}>
  <List variant="card" dividers>
    <ListRow title="Sound" subtitle="Played when the time is up">
      {#snippet trailing()}
        <gtkbox spacing={6} valign="center">
          <IconButton
            icon="media-playback-start-symbolic"
            label="Play sound"
            size="sm"
            disabled={sound === SILENT}
            onclick={() => preview(sound)}
          />
          <Select label="Sound" options={SOUND_OPTIONS} value={sound} onChange={choose} />
        </gtkbox>
      {/snippet}
    </ListRow>
  </List>
</gtkbox>
