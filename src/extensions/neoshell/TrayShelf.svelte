<script lang="ts">
  import type { ShelfTile } from './shelfTiles'

  // The Tray's shelf: one tile per kept file. A tile drags out as its file,
  // opens it on click, and has its own remove button. The drop itself is the
  // notch's, which is where the drag arrives. While a tile is dragged out the
  // notch must stay open: closing it would unmount the tile and GTK would
  // cancel the drag.

  const THUMBNAIL_SIZE = 52
  const PRIMARY_BUTTON = 1

  let {
    tiles,
    height,
    dragOver,
    onopen,
    onremove,
    ondragging,
  }: {
    tiles: ShelfTile[]
    height: number
    // A drag carrying files is over the notch.
    dragOver: boolean
    onopen: (file: string) => void
    onremove: (file: string) => void
    ondragging: (dragging: boolean) => void
  } = $props()

  function shelfClass(isTarget: boolean): string {
    if (isTarget) {
      return 'tray-shelf tray-shelf-target'
    }
    return 'tray-shelf'
  }

  function tileClass(tile: ShelfTile): string {
    if (tile.missing) {
      return 'tray-tile tray-tile-missing'
    }
    return 'tray-tile'
  }

  function draggedFiles(tile: ShelfTile): string[] {
    if (tile.missing) {
      return []
    }
    return [tile.file]
  }

  const thumbnailSize = `min-width: ${THUMBNAIL_SIZE}px; min-height: ${THUMBNAIL_SIZE}px;`

  function pressed(tile: ShelfTile, detail: { button: number }): void {
    if (detail.button !== PRIMARY_BUTTON || tile.missing) {
      return
    }
    onopen(tile.file)
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
        {#each tiles as tile (tile.file)}
          <gtkoverlay>
            <gtkpressable
              class={tileClass(tile)}
              orientation="vertical"
              spacing={6}
              tooltip={tile.path}
              drag-files={draggedFiles(tile)}
              ondragoutbegin={() => ondragging(true)}
              ondragoutend={() => ondragging(false)}
              onpress={(event) => pressed(tile, event.detail)}
            >
              <gtkbox class="tray-thumbnail" css={thumbnailSize} halign="center" clip>
                {#if tile.thumbnail === ''}
                  <gtkicon icon={tile.icon} size={36} hexpand vexpand></gtkicon>
                {:else}
                  <gtkpicture
                    handle={tile.thumbnail}
                    fit="cover"
                    shrink
                    width={THUMBNAIL_SIZE}
                    height={THUMBNAIL_SIZE}
                  ></gtkpicture>
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
              onclicked={() => onremove(tile.file)}
            >
              <gtkicon icon="window-close-symbolic" size={10}></gtkicon>
            </gtkbutton>
          </gtkoverlay>
        {/each}
      </gtkbox>
    </gtkscrolledwindow>
  {/if}
</gtkbox>
