<script lang="ts">
  import { IconButton, NavigationDrawer, Search, TopAppBar, Window } from '@neoworks/gtk-ui'
  import { subscribeTo } from '../../lib/bus'
  import { recordOf, stringOf } from '../../lib/record'
  import type { ViewProps } from '../../host/plugins/views'
  import { resolve } from '../../tree'
  import { History } from './history.svelte'
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
  //
  // Wide, the sidebar and the page sit side by side and the page's column is
  // held to PAGE_WIDTH, centred. Narrower than COMPACT_WIDTH there is room for
  // one of them: the sidebar, until a section is chosen, then that page with a
  // way back.

  const SIDEBAR_WIDTH = 230
  const PAGE_WIDTH = 680
  const COMPACT_WIDTH = 640

  let { bus, registry }: ViewProps = $props()

  const history = new History()

  let open = $state(false)
  let query = $state('')
  let sections = $state<Section[]>([])
  let windowWidth = $state(0)
  // Compact only: whether the page is showing instead of the sidebar.
  let pageShown = $state(false)
  // The registry is outside Svelte's reactivity; a section whose view
  // registers after the window is up is picked up by bumping this.
  let generation = $state(0)

  const compact = $derived(windowWidth > 0 && windowWidth < COMPACT_WIDTH)
  const shown = $derived(navSectionsOf(matching(sections, query)))
  const selected = $derived(selectedSection(sections, history.current))
  const Page = $derived(viewFor(selected, generation))

  $effect(() =>
    subscribeTo(bus, 'settings:open', (message) => {
      const wanted = stringOf(recordOf(message.data).section)
      if (wanted !== '') {
        choose(wanted)
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

  function choose(id: string): void {
    history.visit(id)
    pageShown = true
  }

  function resized(event: { target: { widget: { get_width(): number } } }): void {
    windowWidth = event.target.widget.get_width()
  }

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

  function showsSidebar(isCompact: boolean, isPageShown: boolean): boolean {
    return !isCompact || !isPageShown
  }

  function showsPage(isCompact: boolean, isPageShown: boolean): boolean {
    return !isCompact || isPageShown
  }
</script>

{#if open}
  <Window title="Settings" scheme="system" width={940} height={660} onclose={() => (open = false)}>
    <gtkclamp onwidth-changed={resized}>
      <gtkbox class="settings-root" orientation="horizontal">
        {#if showsSidebar(compact, pageShown)}
          <gtkbox class="settings-sidebar" hexpand={compact} css="min-width: {SIDEBAR_WIDTH}px;">
            <NavigationDrawer sections={shown} current={idOf(selected)} onselect={choose}>
              {#snippet header()}
                <gtkbox class="settings-search">
                  <Search placeholder="Search" size="sm" bind:value={query} />
                </gtkbox>
              {/snippet}
            </NavigationDrawer>
          </gtkbox>
        {/if}
        {#if showsPage(compact, pageShown)}
          <!-- The title bar is in the clamped column too, so the title lines
               up with the page under it however wide the window is. -->
          <gtkclamp maximum={PAGE_WIDTH} hexpand>
            <gtkbox class="settings-main" orientation="vertical">
              <TopAppBar title={titleOf(selected)} leading={navigation} />
              <!-- The box stays the scrolled window's only child: switching
                   pages inserts the new one before the old one leaves. -->
              <gtkscrolledwindow class="settings-page" vexpand hscroll="never">
                <gtkbox orientation="vertical">
                  {#if Page !== undefined}
                    {#key idOf(selected)}
                      <gtkbox class="settings-page-content" orientation="vertical">
                        <Page {bus} {registry} args={{}} id={idOf(selected)} />
                      </gtkbox>
                    {/key}
                  {:else}
                    <gtklabel class="settings-missing" vexpand>This section is not available</gtklabel>
                  {/if}
                </gtkbox>
              </gtkscrolledwindow>
            </gtkbox>
          </gtkclamp>
        {/if}
      </gtkbox>
    </gtkclamp>
  </Window>
{/if}

<!-- Compact, the way back to the sidebar; otherwise back and forward through
     the sections visited. -->
{#snippet navigation()}
  {#if compact}
    <IconButton icon="go-previous-symbolic" label="All settings" size="sm" onclick={() => (pageShown = false)} />
  {:else}
    <gtkbox class="settings-history" spacing={2}>
      <IconButton
        icon="go-previous-symbolic"
        label="Back"
        size="sm"
        disabled={!history.canGoBack}
        onclick={() => history.back()}
      />
      <IconButton
        icon="go-next-symbolic"
        label="Forward"
        size="sm"
        disabled={!history.canGoForward}
        onclick={() => history.forward()}
      />
    </gtkbox>
  {/if}
{/snippet}
