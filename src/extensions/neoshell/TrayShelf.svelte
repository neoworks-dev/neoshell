<script lang="ts">
  import { tileOf } from './trayFiles'
  import type { TrayTile } from './trayFiles'

  // The Tray's shelf: one tile per kept file. A tile drags out as its file,
  // opens it on click, and has its own remove button. The drop itself is the
  // notch's, which is where the drag arrives.

  const THUMBNAIL_SIZE = 52
  const PRIMARY_BUTTON = 1

  let {
    paths,
    height,
    dragOver,
    onopen,
    onremove,
  }: {
    paths: string[]
    height: number
    // A drag carrying files is over the notch.
    dragOver: boolean
    onopen: (path: string) => void
    onremove: (path: string) => void
  } = $props()

  const tiles = $derived(paths.map(tileOf))

  function shelfClass(isTarget: boolean): string {
    if (isTarget) {
      return 'tray-shelf tray-shelf-target'
    }
    return 'tray-shelf'
  }

  function tileClass(tile: TrayTile): string {
    if (tile.missing) {
      return 'tray-tile tray-tile-missing'
    }
    return 'tray-tile'
  }

  function draggedPaths(tile: TrayTile): string[] {
    if (tile.missing) {
      return []
    }
    return [tile.path]
  }

  function thumbnailCss(tile: TrayTile): string {
    const size = `min-width: ${THUMBNAIL_SIZE}px; min-height: ${THUMBNAIL_SIZE}px;`
    if (tile.thumbnail === '') {
      return size
    }
    return `${size} background-image: url("${tile.thumbnail}"); background-size: cover; background-position: center;`
  }

  function pressed(tile: TrayTile, detail: { button: number }): void {
    if (detail.button !== PRIMARY_BUTTON || tile.missing) {
      return
    }
    onopen(tile.path)
  }
</script>

<gtkbox class={shelfClass(dragOver)} orientation="vertical" hexpand css="min-height: {height}px;">
  {#if tiles.length === 0}
    <gtkbox orientation="vertical" spacing={6} vexpand valign="center">
      <gtkicon icon="folder-download-symbolic" size={24}></gtkicon>
      <gtklabel class="tray-empty">Drop files here to keep them handy</gtklabel>
    </gtkbox>
  {:else}
    <gtkscrolledwindow vscroll="never" vexpand>
      <gtkbox orientation="horizontal" spacing={6} valign="center">
        {#each tiles as tile (tile.path)}
          <gtkoverlay>
            <gtkpressable
              class={tileClass(tile)}
              orientation="vertical"
              spacing={6}
              tooltip={tile.path}
              drag-files={draggedPaths(tile)}
              onpress={(event) => pressed(tile, event.detail)}
            >
              <gtkbox class="tray-thumbnail" css={thumbnailCss(tile)} halign="center">
                {#if tile.thumbnail === ''}
                  <gtkicon icon={tile.icon} size={36} hexpand vexpand></gtkicon>
                {/if}
              </gtkbox>
              <gtklabel class="tray-name" ellipsize="middle" max-width-chars={10}>
                {tile.name}
              </gtklabel>
            </gtkpressable>
            <gtkbutton
              overlay
              class="tray-remove"
              frame={false}
              halign="end"
              valign="start"
              tooltip="Remove from Tray"
              onclicked={() => onremove(tile.path)}
            >
              <gtkicon icon="window-close-symbolic" size={10}></gtkicon>
            </gtkbutton>
          </gtkoverlay>
        {/each}
      </gtkbox>
    </gtkscrolledwindow>
  {/if}
</gtkbox>
