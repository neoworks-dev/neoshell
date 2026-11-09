<script lang="ts">
  import { Search } from '@neoworks/gtk-ui'
  import type { Section } from './sections'

  // The Settings sidebar: a search field over the sections, grouped, each on
  // a coloured tile the way a macOS settings window draws them. gtk-ui's
  // NavigationDrawer was the first choice, but its items carry no colour and
  // draw their icon on a status-toned circle, so the rows are drawn here.

  const ICON_PIXELS = 14

  let {
    groups,
    current,
    onselect,
    query = $bindable(''),
  }: {
    groups: Section[][]
    current: string
    onselect: (id: string) => void
    query?: string
  } = $props()

  function itemClass(section: Section, currentId: string): string {
    if (section.id === currentId) {
      return 'settings-sidebar-item active'
    }
    return 'settings-sidebar-item'
  }
</script>

<gtkbox class="settings-sidebar-panel" orientation="vertical" vexpand>
  <gtkbox class="settings-search">
    <Search placeholder="Search" size="sm" bind:value={query} />
  </gtkbox>
  <gtkscrolledwindow hscroll="never" vexpand>
    <gtkbox orientation="vertical" spacing={2}>
      {#each groups as group, index (index)}
        {#if index > 0}
          <gtkbox class="settings-sidebar-gap"></gtkbox>
        {/if}
        {#each group as section (section.id)}
          <gtkbutton class={itemClass(section, current)} frame={false} onclicked={() => onselect(section.id)}>
            <gtkbox orientation="horizontal" spacing={9}>
              <!-- The icon expands to centre itself; the tile's own expand is
                   pinned off so that does not spread to the row. -->
              <gtkbox
                class="settings-tile settings-tile-{section.color}"
                valign="center"
                hexpand={false}
                vexpand={false}
              >
                <gtkicon icon={section.icon} size={ICON_PIXELS} hexpand vexpand halign="center" valign="center"></gtkicon>
              </gtkbox>
              <gtklabel class="settings-sidebar-label" halign="start" hexpand ellipsize="end">{section.title}</gtklabel>
            </gtkbox>
          </gtkbutton>
        {/each}
      {/each}
    </gtkbox>
  </gtkscrolledwindow>
</gtkbox>
