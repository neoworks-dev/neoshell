<script lang="ts">
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { recordOf, stringOf } from '../../lib/record'
  import type { ViewProps } from '../../host/plugins/views'
  import { widgetBoxOf } from '../../lib/widget'
  import GalleryTile from './GalleryTile.svelte'
  import { initialAssignment, nextSwap, startOf } from './cycle'
  import { boxesOf, planOf, swapOrder } from './layout'
  import { libraryOf } from './topic'
  import type { Library, LibraryImage } from './topic'

  // The desktop picture gallery in the three widget sizes. Each size has a
  // layout of its own (layout.ts): a grid of equal tiles or a mosaic with one
  // large picture. Every interval one tile fades to the next picture; a click
  // opens the picture in the default viewer.
  //
  // The widget is sandboxed, so it never sees a path: the library holds file
  // handles, and thumbnails are asked of the backend one tile at a time.

  // The card's padding plus its 1px border, on each side.
  const CARD_INSET_PX = 7
  const TILE_GAP_PX = 4
  const CALL_TIMEOUT_MS = 15000
  const MIN_SIDE_PX = 40

  let { bus, args, id }: ViewProps = $props()

  let library = $state<Library | null>(null)
  let assignment = $state<number[]>([])

  let cursor = 0
  let tick = 0

  const box = $derived(widgetBoxOf(args))
  const imageCount = $derived(imageCountOf(library))
  const plan = $derived(planOf(box.size, layoutOf(library), imageCount))
  const tileBoxes = $derived(
    boxesOf(plan, innerSide(box.width), innerSide(box.height), TILE_GAP_PX),
  )
  const order = $derived(swapOrder(plan.tiles.length))
  const intervalMs = $derived(intervalOf(library))

  $effect(() =>
    subscribeTo(bus, 'gallery.library', (message) => {
      library = libraryOf(message.data)
    }),
  )

  // A new scan or another arrangement starts the sequence over.
  $effect(() => {
    const tileCount = plan.tiles.length
    const count = imageCount
    void versionOf(library)
    untrack(() => {
      const start = startOf(id, count)
      assignment = initialAssignment(tileCount, count, start)
      cursor = (start + tileCount) % Math.max(1, count)
      tick = 0
    })
  })

  $effect(() => {
    if (plan.tiles.length < 2) {
      return
    }
    const timer = setInterval(step, intervalMs)
    return () => {
      clearInterval(timer)
    }
  })

  function step(): void {
    const result = nextSwap(assignment, order, tick, cursor, imageCount)
    tick += 1
    cursor = result.cursor
    if (result.swap === null) {
      return
    }
    const next = [...assignment]
    next[result.swap.tile] = result.swap.image
    assignment = next
  }

  function innerSide(side: number): number {
    return Math.max(MIN_SIDE_PX, side - 2 * CARD_INSET_PX)
  }

  function imageCountOf(current: Library | null): number {
    if (current === null) {
      return 0
    }
    return current.images.length
  }

  function versionOf(current: Library | null): number {
    if (current === null) {
      return 0
    }
    return current.version
  }

  function layoutOf(current: Library | null): string {
    if (current === null) {
      return 'grid'
    }
    return current.layout
  }

  function intervalOf(current: Library | null): number {
    if (current === null) {
      return 6000
    }
    return current.intervalSeconds * 1000
  }

  function imageAt(tile: number): LibraryImage | undefined {
    if (library === null) {
      return undefined
    }
    return library.images[assignment[tile]]
  }

  async function load(file: string, pixels: number): Promise<string> {
    const reply = recordOf(
      await bus.call('gallery:thumbnail', { file, pixels }, CALL_TIMEOUT_MS).catch(() => ({})),
    )
    return stringOf(reply.handle)
  }

  function open(image: LibraryImage): void {    void bus.call('gallery:open', { file: image.file }, CALL_TIMEOUT_MS).catch(() => ({}))
  }

  function openSettings(): void {
    bus.publish('settings:open', { section: 'gallery' })
  }
</script>

{#snippet notice(icon: string, title: string, folder: string)}
  <gtkbox class="picture-empty" orientation="vertical" spacing={4} halign="center" valign="center" vexpand>
    <gtkicon {icon} size={28}></gtkicon>
    <gtklabel class="card-title">{title}</gtklabel>
    <gtklabel class="card-hint" wrap justify="center" ellipsize="end" lines={2}>{folder}</gtklabel>
    <gtkbutton class="picture-link" frame={false} onclicked={openSettings}>Choose a folder</gtkbutton>
  </gtkbox>
{/snippet}

<gtkbox class="card picture-card" orientation="vertical" hexpand vexpand>
  {#if library === null}
    <gtkbox class="picture-empty" orientation="vertical" spacing={6} halign="center" valign="center" vexpand>
      <gtkspinner spinning></gtkspinner>
      <gtklabel class="card-hint">Loading pictures…</gtklabel>
    </gtkbox>
  {:else if library.status === 'missing'}
    {@render notice('folder-open-symbolic', 'Folder not found', library.folder)}
  {:else if library.status === 'empty'}
    {@render notice('image-x-generic-symbolic', 'No pictures here', library.folder)}
  {:else}
    <gtkoverlay hexpand vexpand>
      <gtkbox width={innerSide(box.width)} height={innerSide(box.height)}></gtkbox>
      {#each plan.tiles as _tile, index (`${box.size}-${library.layout}-${index}`)}
        <GalleryTile
          box={tileBoxes[index]}
          bounds={{ width: innerSide(box.width), height: innerSide(box.height) }}
          image={imageAt(index)}
          {load}
          onopen={open}
        />
      {/each}
    </gtkoverlay>
  {/if}
</gtkbox>
