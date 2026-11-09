<script lang="ts">
  import { NavigationDrawer, Search, TopAppBar, Window } from '@neoworks/gtk-ui'
  import { subscribeTo } from '../../lib/bus'
  import { recordOf, stringOf } from '../../lib/record'
  import type { ViewProps } from '../../host/plugins/views'
  import { resolve } from '../../tree'
  import { matching, navSectionsOf, sectionsOf } from './sections'
  import type { Section } from './sections'

  // The unified Settings window. It knows nothing about any one setting: every
  // sidebar entry is a section an extension declares in its manifest
  // (settings.catalog), and the page beside it is that extension's own
  // registered view.
  //
  //   settings:open  {section?}   opens the window, on that section if given
  //
  // A detached tree node: it is a regular application window, mapped only
  // while open, not a layer surface the shell keeps around.

  const SIDEBAR_WIDTH = 240

  let { bus, registry }: ViewProps = $props()

  let open = $state(false)
  let current = $state('')
  let query = $state('')
  let sections = $state<Section[]>([])
  // The registry is outside Svelte's reactivity; a section whose view
  // registers after the window is up is picked up by bumping this.
  let generation = $state(0)

  const shown = $derived(navSectionsOf(matching(sections, query)))
  const selected = $derived(selectedSection(sections, current))
  const Page = $derived(viewFor(selected, generation))

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
      sections = sectionsOf(recordOf(message.data).sections)
    }),
  )

  $effect(() =>
    registry.onChange(() => {
      generation += 1
    }),
  )

  // An unknown or unset section falls back to the first one.
  function selectedSection(all: Section[], id: string): Section | undefined {
    const found = all.find((section) => section.id === id)
    if (found !== undefined) {
      return found
    }
    return all[0]
  }

  function viewFor(section: Section | undefined, currentGeneration: number) {
    if (section === undefined) {
      return undefined
    }
    return resolve(registry, section.view, currentGeneration)
  }

  function idOf(section: Section | undefined): string {
    if (section === undefined) {
      return ''
    }
    return section.id
  }

  function titleOf(section: Section | undefined): string {
    if (section === undefined) {
      return 'Settings'
    }
    return section.title
  }
</script>

{#if open}
  <Window title="Settings" scheme="system" width={920} height={640} onclose={() => (open = false)}>
    <gtkbox orientation="horizontal">
      <gtkbox hexpand={false} css="min-width: {SIDEBAR_WIDTH}px;">
        <NavigationDrawer sections={shown} current={idOf(selected)} onselect={(id) => (current = id)}>
          {#snippet header()}
            <gtkbox class="settings-search">
              <Search placeholder="Search" size="sm" bind:value={query} />
            </gtkbox>
          {/snippet}
        </NavigationDrawer>
      </gtkbox>
      <gtkbox orientation="vertical" hexpand>
        <TopAppBar title={titleOf(selected)} />
        <!-- The scrolled window keeps one box as its only child: switching
             pages inserts the new one before the old one leaves, and a
             scrolled window's single child slot would end up empty. -->
        <gtkscrolledwindow class="settings-page" vexpand hscroll="never">
          <gtkbox orientation="vertical">
            {#if Page !== undefined}
              {#key idOf(selected)}
                <Page {bus} {registry} args={{}} id={idOf(selected)} />
              {/key}
            {:else}
              <gtklabel class="settings-missing" vexpand>This section is not available</gtklabel>
            {/if}
          </gtkbox>
        </gtkscrolledwindow>
      </gtkbox>
    </gtkbox>
  </Window>
{/if}
