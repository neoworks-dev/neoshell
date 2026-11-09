<script lang="ts">
  import { List, ListRow, SectionHeader, SegmentedButton, Slider, Switch, TextField } from '@neoworks/gtk-ui'
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { Settings } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import { DEFAULT_INTERVAL_SECONDS, MAX_INTERVAL_SECONDS, MIN_INTERVAL_SECONDS } from './library'
  import { libraryOf } from './topic'
  import type { Library } from './topic'

  // Settings → Gallery: the folder, how often a picture changes, the order and
  // the arrangement. The folder is applied a moment after typing stops, since
  // each change walks the folder again.

  const LAYOUTS = [
    { value: 'grid', label: 'Grid', icon: 'view-grid-symbolic' },
    { value: 'mosaic', label: 'Mosaic', icon: 'view-dual-symbolic' },
  ]
  const FOLDER_DEBOUNCE_MS = 700

  let { bus }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))

  let library = $state<Library | null>(null)
  let folderDraft = $state('')
  let folderSeeded = false
  let applyTimer: ReturnType<typeof setTimeout> | undefined

  const interval = $derived(settings.number('gallery.intervalSeconds', DEFAULT_INTERVAL_SECONDS))
  const shuffle = $derived(settings.boolean('gallery.shuffle', false))
  const layout = $derived(settings.string('gallery.layout', 'grid'))
  const folderStatus = $derived(folderStatusOf(library))

  $effect(() => settings.connect())

  $effect(() =>
    subscribeTo(bus, 'gallery.library', (message) => {
      library = libraryOf(message.data)
      seedFolder(library)
    }),
  )

  $effect(() => () => clearTimeout(applyTimer))

  // The draft starts as the folder in use, once; later publishes (the scan
  // that follows an edit) must not overwrite what is being typed.
  function seedFolder(current: Library): void {
    if (folderSeeded) {
      return
    }
    folderSeeded = true
    folderDraft = current.folder
  }

  function folderStatusOf(current: Library | null): string {
    if (current === null) {
      return 'Looking for pictures…'
    }
    if (current.status === 'missing') {
      return 'That folder does not exist.'
    }
    if (current.status === 'empty') {
      return 'No pictures found in that folder.'
    }
    return `${current.images.length} pictures found.`
  }

  function applyFolder(): void {
    clearTimeout(applyTimer)
    settings.set('gallery.folder', folderDraft.trim())
  }

  function folderTyped(): void {
    clearTimeout(applyTimer)
    applyTimer = setTimeout(applyFolder, FOLDER_DEBOUNCE_MS)
  }

  function intervalLabel(seconds: number): string {
    return `${seconds} s`
  }
</script>

<gtkbox class="settings-content" orientation="vertical" spacing={8}>
  <SectionHeader title="Gallery" description="Pictures from a folder, changing slowly on the desktop." level={3} />
  <gtkbox orientation="vertical" spacing={4}>
    <TextField
      label="Folder"
      placeholder="~/Pictures"
      icon="folder-symbolic"
      bind:value={folderDraft}
      error={library !== null && library.status === 'missing'}
      supportingText={folderStatus}
      oninput={folderTyped}
      onsubmit={applyFolder}
    />
  </gtkbox>

  <List variant="card" dividers>
    <ListRow title="Change every" subtitle="One picture fades to the next at this pace">
      {#snippet trailing()}
        <Slider
          value={interval}
          min={MIN_INTERVAL_SECONDS}
          max={MAX_INTERVAL_SECONDS}
          step={1}
          showValue
          formatValue={intervalLabel}
          oninput={(seconds) => settings.set('gallery.intervalSeconds', seconds)}
        />
      {/snippet}
    </ListRow>
    <ListRow title="Shuffle" subtitle="Random order instead of newest first">
      {#snippet trailing()}
        <Switch label="Shuffle" hideLabel checked={shuffle} onchange={(on) => settings.set('gallery.shuffle', on)} />
      {/snippet}
    </ListRow>
    <ListRow title="Layout" subtitle="Equal tiles, or one large picture with smaller ones">
      {#snippet trailing()}
        <SegmentedButton
          label="Gallery layout"
          options={LAYOUTS}
          value={layout}
          onchange={(value) => settings.set('gallery.layout', value)}
        />
      {/snippet}
    </ListRow>
  </List>
</gtkbox>
