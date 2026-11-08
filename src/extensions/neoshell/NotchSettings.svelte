<script lang="ts">
  import {
    Card,
    IconButton,
    ListRow,
    SectionHeader,
    SegmentedButton,
    Slider,
    Switch,
    TextField,
  } from '@neoworks/gtk-ui'
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record'
  import { Settings } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import type { NotchWidgetDeclaration } from '../index'
  import { NOOK_KEY, clampCells, enabledEntries, moved, nookEntries, withEntry } from './nook'
  import type { NookEntry } from './nook'

  // Settings → Notch. General holds the notch's behaviour; Customize widgets
  // is the Nook configurator: a preview of the open notch, one card per widget
  // the extensions declare (notch.catalog) with an on/off switch, and the
  // chosen widget's width in cells and place in the row.

  const PAGES = [
    { value: 'general', label: 'General' },
    { value: 'widgets', label: 'Customize widgets' },
  ]
  const OPEN_ON = [
    { value: 'click', label: 'Click' },
    { value: 'hover', label: 'Hover' },
  ]
  // The preview draws a cell at this many pixels rather than the notch's 56.
  const PREVIEW_CELL_WIDTH = 40

  let { bus, args }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))

  // args.page opens on a page other than General.
  let page = $state(untrack(() => initialPage(args)))
  let catalog = $state<NotchWidgetDeclaration[]>([])
  let chosenType = $state('')

  const entries = $derived(nookEntries(catalog, settings.value(NOOK_KEY)))
  const shown = $derived(enabledEntries(entries))
  const chosen = $derived(chosenEntry(entries, chosenType))
  const chosenWidget = $derived(widgetFor(chosen))
  const openOn = $derived(settings.string('notch.openOn', 'click'))
  const receiving = $derived(settings.string('quickshare.visibility', 'invisible') === 'visible')
  const deviceName = $derived(settings.string('quickshare.deviceName', ''))

  $effect(() => settings.connect())

  $effect(() =>
    subscribeTo(bus, 'notch.catalog', (message) => {
      catalog = arrayOf(recordOf(message.data).widgets).map(declarationOf)
    }),
  )

  function initialPage(viewArgs: unknown): string {
    const wanted = stringOf(recordOf(viewArgs).page)
    if (PAGES.some((candidate) => candidate.value === wanted)) {
      return wanted
    }
    return 'general'
  }

  function setReceiving(on: boolean): void {
    if (on) {
      settings.set('quickshare.visibility', 'visible')
      return
    }
    settings.set('quickshare.visibility', 'invisible')
  }

  function save(next: NookEntry[]): void {
    settings.set(NOOK_KEY, next)
  }

  function setEnabled(entry: NookEntry, enabled: boolean): void {
    save(withEntry(entries, { ...entry, enabled }))
  }

  function setCells(cells: number): void {
    if (chosen === undefined || chosenWidget === undefined) {
      return
    }
    save(withEntry(entries, { ...chosen, cells: clampCells(chosenWidget, cells) }))
  }

  function move(offset: number): void {
    if (chosen === undefined) {
      return
    }
    save(moved(entries, chosen.type, offset))
  }

  function chosenEntry(list: NookEntry[], type: string): NookEntry | undefined {
    const found = list.find((entry) => entry.type === type)
    if (found !== undefined) {
      return found
    }
    return list[0]
  }

  function widgetFor(entry: NookEntry | undefined): NotchWidgetDeclaration | undefined {
    if (entry === undefined) {
      return undefined
    }
    return catalog.find((widget) => widget.type === entry.type)
  }

  function nameOf(entry: NookEntry): string {
    const widget = catalog.find((candidate) => candidate.type === entry.type)
    if (widget === undefined) {
      return entry.type
    }
    return widget.name
  }

  function iconOf(entry: NookEntry): string {
    const widget = catalog.find((candidate) => candidate.type === entry.type)
    if (widget === undefined) {
      return 'application-x-addon-symbolic'
    }
    return widget.icon
  }

  function cardClass(entry: NookEntry, chosenEntryType: string): string {
    if (entry.type === chosenEntryType) {
      return 'nook-config-card nook-config-card-chosen'
    }
    return 'nook-config-card'
  }

  function typeOf(entry: NookEntry | undefined): string {
    if (entry === undefined) {
      return ''
    }
    return entry.type
  }

  function positionOf(entry: NookEntry | undefined): number {
    if (entry === undefined) {
      return -1
    }
    return entries.findIndex((candidate) => candidate.type === entry.type)
  }

  function declarationOf(record: Record<string, unknown>): NotchWidgetDeclaration {
    return {
      type: stringOf(record.type),
      name: stringOf(record.name),
      icon: stringOf(record.icon),
      defaultCells: numberOf(record.defaultCells, 4),
      minCells: numberOf(record.minCells, 3),
      maxCells: numberOf(record.maxCells, 8),
    }
  }
</script>

<gtkbox class="settings-content" orientation="vertical" spacing={20}>
  <gtkbox halign="center">
    <SegmentedButton label="Notch settings page" options={PAGES} bind:value={page} variant="tonal" />
  </gtkbox>

  {#if page === 'general'}
    {@render general()}
  {:else}
    {@render widgets()}
  {/if}
</gtkbox>

{#snippet general()}
  <SectionHeader title="Behaviour" level={4} />
  <Card padding="none">
    <ListRow title="Opens on" subtitle="Closes again when the pointer leaves">
      {#snippet trailing()}
        <SegmentedButton
          label="Opens on"
          options={OPEN_ON}
          value={openOn}
          size="sm"
          onchange={(value) => settings.set('notch.openOn', value)}
        />
      {/snippet}
    </ListRow>
  </Card>

  <SectionHeader title="Quick Share" description="Send and receive files with Android phones nearby." level={4} />
  <Card padding="none">
    <ListRow title="Receiving" subtitle="Visible to everyone nearby while on">
      {#snippet trailing()}
        <Switch label="Receiving" hideLabel checked={receiving} onchange={setReceiving} />
      {/snippet}
    </ListRow>
    <ListRow title="Device name" subtitle="What phones see; Enter saves it. Empty uses the host name.">
      {#snippet trailing()}
        <gtkbox css="min-width: 220px;">
          <TextField
            label="Device name"
            value={deviceName}
            onsubmit={(name) => settings.set('quickshare.deviceName', name.trim())}
          />
        </gtkbox>
      {/snippet}
    </ListRow>
  </Card>
{/snippet}

{#snippet widgets()}
  <!-- The open notch, drawn small: one block per enabled widget, as wide as
       its cells. -->
  <gtkbox class="nook-preview-backdrop" halign="fill">
    <gtkbox class="nook-preview" orientation="horizontal" spacing={8} halign="center">
      {#each shown as entry (entry.type)}
        <gtkbox
          class="nook-preview-block"
          orientation="vertical"
          spacing={6}
          css="min-width: {entry.cells * PREVIEW_CELL_WIDTH}px;"
        >
          <gtkicon icon={iconOf(entry)} size={18} vexpand valign="end"></gtkicon>
          <gtklabel class="nook-preview-name" vexpand valign="start">{nameOf(entry)}</gtklabel>
        </gtkbox>
      {:else}
        <gtklabel class="nook-preview-empty">No widgets</gtklabel>
      {/each}
    </gtkbox>
  </gtkbox>

  <gtkscrolledwindow vscroll="never" min-content-height={76}>
    <gtkbox orientation="horizontal" spacing={10}>
      {#each entries as entry (entry.type)}
        <gtkbox class={cardClass(entry, typeOf(chosen))} orientation="horizontal" spacing={10}>
          <gtkbutton class="nook-config-pick" frame={false} onclicked={() => (chosenType = entry.type)}>
            <gtkbox orientation="horizontal" spacing={10}>
              <gtkbox class="nook-config-icon" valign="center">
                <gtkicon icon={iconOf(entry)} size={18}></gtkicon>
              </gtkbox>
              <gtkbox orientation="vertical" spacing={0} valign="center">
                <gtklabel class="nook-config-name" halign="start">{nameOf(entry)}</gtklabel>
                <gtklabel class="nook-config-cells" halign="start">{entry.cells} cells</gtklabel>
              </gtkbox>
            </gtkbox>
          </gtkbutton>
          <gtkbox valign="center">
            <Switch
              label="Show {nameOf(entry)}"
              hideLabel
              checked={entry.enabled}
              onchange={(enabled) => setEnabled(entry, enabled)}
            />
          </gtkbox>
        </gtkbox>
      {/each}
    </gtkbox>
  </gtkscrolledwindow>

  {#if chosen !== undefined && chosenWidget !== undefined}
    <Card padding="none">
      <ListRow title="Width" subtitle="{chosenWidget.name}, in cells">
        {#snippet trailing()}
          <gtkbox css="min-width: 260px;">
            <Slider
              label="Width"
              min={chosenWidget.minCells}
              max={chosenWidget.maxCells}
              value={chosen.cells}
              showValue
              showTicks
              oninput={setCells}
            />
          </gtkbox>
        {/snippet}
      </ListRow>
      <ListRow title="Position" subtitle="Order in the open notch">
        {#snippet trailing()}
          <gtkbox orientation="horizontal" spacing={4}>
            <IconButton
              icon="go-previous-symbolic"
              label="Move left"
              variant="tonal"
              size="sm"
              disabled={positionOf(chosen) <= 0}
              onclick={() => move(-1)}
            />
            <IconButton
              icon="go-next-symbolic"
              label="Move right"
              variant="tonal"
              size="sm"
              disabled={positionOf(chosen) >= entries.length - 1}
              onclick={() => move(1)}
            />
          </gtkbox>
        {/snippet}
      </ListRow>
    </Card>
  {/if}
{/snippet}
