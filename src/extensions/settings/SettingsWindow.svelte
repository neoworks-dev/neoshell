<script lang="ts">
  import { Tabs, Window } from '@neoworks/gtk-ui'
  import type { TabItem } from '@neoworks/gtk-ui'
  import { subscribeTo } from '../../lib/bus'
  import { arrayOf, recordOf, stringOf } from '../../lib/record'
  import type { ViewProps } from '../../host/plugins/views'
  import { resolve } from '../../tree'

  // The unified Settings window. It knows nothing about any one setting: every
  // tab is a section an extension declares in its manifest (settings.catalog),
  // and the page under a tab is that extension's own registered view.
  //
  //   settings:open  {section?}   opens the window, on that tab if given
  //
  // A detached tree node: it is a regular application window, mapped only
  // while open, not a layer surface the shell keeps around.

  interface Section {
    id: string
    title: string
    icon: string
    view: string
  }

  let { bus, registry }: ViewProps = $props()

  let open = $state(false)
  let current = $state('')
  let sections = $state<Section[]>([])
  // The registry is outside Svelte's reactivity; a section whose view
  // registers after the window is up is picked up by bumping this.
  let generation = $state(0)

  const tabs = $derived(sections.map(tabOf))

  $effect(() =>
    subscribeTo(bus, 'settings:open', (message) => {
      const wanted = stringOf(recordOf(message.data).section)
      if (wanted !== '') {
        current = wanted
      }
      open = true
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'settings.catalog', (message) => {
      sections = arrayOf(recordOf(message.data).sections).map(sectionOf)
    }),
  )

  $effect(() =>
    registry.onChange(() => {
      generation += 1
    }),
  )

  function sectionOf(record: Record<string, unknown>): Section {
    return {
      id: stringOf(record.id),
      title: stringOf(record.title),
      icon: stringOf(record.icon),
      view: stringOf(record.view),
    }
  }

  function tabOf(section: Section): TabItem {
    return { id: section.id, label: section.title, icon: section.icon }
  }

  function viewFor(id: string, currentGeneration: number) {
    const section = sections.find((candidate) => candidate.id === id)
    if (section === undefined) {
      return undefined
    }
    return resolve(registry, section.view, currentGeneration)
  }
</script>

{#if open}
  <Window title="Settings" scheme="system" width={760} height={600} onclose={() => (open = false)}>
    <Tabs {tabs} bind:value={current} variant="toolbar" label="Settings sections">
      {#snippet panel(selected)}
        {@const Page = viewFor(selected, generation)}
        <gtkscrolledwindow class="settings-page" vexpand hscroll="never">
          {#if Page !== undefined}
            <Page {bus} {registry} args={{}} id={selected} />
          {:else}
            <gtklabel class="settings-missing" vexpand>This section is not available</gtklabel>
          {/if}
        </gtkscrolledwindow>
      {/snippet}
    </Tabs>
  </Window>
{/if}
