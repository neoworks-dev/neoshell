<script lang="ts">
  import { dragOf, pressOf, PRIMARY_BUTTON } from '../neoshell/gestures'
  import { thumbnailPixels } from './layout'
  import type { TileBox } from './layout'
  import type { LibraryImage } from './topic'

  // One tile: a stack of two pictures. A new picture is loaded into the page
  // that is not showing and then the stack flips to it, so the old one fades
  // out under the new one.

  const FADE_MS = 1100
  // A press that ends a drag of the widget is not a click on the picture.
  const CLICK_SLOP_PX = 4

  let {
    box,
    bounds,
    image,
    load,
    onopen,
  }: {
    box: TileBox
    // The size of the area the tiles are laid out in. The tile is stretched
    // across it and held in place by margins, because an overlay child that
    // does not fill is given its content's natural size, which for a picture
    // is the thumbnail's.
    bounds: { width: number; height: number }
    image: LibraryImage | undefined
    load: (file: string, pixels: number) => Promise<string>
    onopen: (image: LibraryImage) => void
  } = $props()

  let handleFirst = $state('')
  let handleSecond = $state('')
  let page = $state('first')
  let loaded = $state(false)

  let shownFile = ''
  let shownPixels = 0
  let ticket = 0
  let dragged = false

  const pixels = $derived(thumbnailPixels(box))
  const tooltip = $derived(tooltipOf(image))
  const tileClass = $derived(tileClassOf(loaded))
  // Naming a page before the stack has its children logs a GTK warning; until
  // the first picture arrives the stack shows its first page anyway.
  const visiblePage = $derived(visiblePageOf(loaded, page))

  $effect(() => {
    if (image === undefined) {
      return
    }
    void show(image.file, pixels)
  })

  async function show(file: string, wantedPixels: number): Promise<void> {
    if (file === shownFile && wantedPixels <= shownPixels) {
      return
    }
    ticket += 1
    const mine = ticket
    const handle = await load(file, wantedPixels)
    if (mine !== ticket || handle === '') {
      return
    }
    shownFile = file
    shownPixels = wantedPixels
    flipTo(handle)
  }

  function flipTo(handle: string): void {
    loaded = true
    if (page === 'first') {
      handleSecond = handle
      page = 'second'
      return
    }
    handleFirst = handle
    page = 'first'
  }

  function startDrag(): void {
    dragged = false
  }

  function moveDrag(event: { detail: unknown }): void {
    const drag = dragOf(event)
    if (Math.abs(drag.dx) > CLICK_SLOP_PX || Math.abs(drag.dy) > CLICK_SLOP_PX) {
      dragged = true
    }
  }

  function press(event: { detail: unknown }): void {
    const wasDrag = dragged
    dragged = false
    if (wasDrag || image === undefined || pressOf(event).button !== PRIMARY_BUTTON) {
      return
    }
    onopen(image)
  }

  function tooltipOf(shown: LibraryImage | undefined): string {
    if (shown === undefined) {
      return ''
    }
    return shown.name
  }

  function visiblePageOf(isLoaded: boolean, current: string): string | undefined {
    if (isLoaded) {
      return current
    }
    return undefined
  }

  function tileClassOf(isLoaded: boolean): string {
    if (isLoaded) {
      return 'picture-tile'
    }
    return 'picture-tile loading'
  }
</script>

<gtkpressable
  overlay
  class={tileClass}
  margin-start={box.x}
  margin-top={box.y}
  margin-end={bounds.width - box.x - box.width}
  margin-bottom={bounds.height - box.y - box.height}
  clip
  {tooltip}
  onpress={press}
  ondragstart={startDrag}
  ondragmove={moveDrag}
>
  <gtkstack transition="crossfade" duration={FADE_MS} hexpand vexpand page={visiblePage}>
    <gtkpicture name="first" handle={handleFirst} fit="cover" shrink hexpand vexpand></gtkpicture>
    <gtkpicture name="second" handle={handleSecond} fit="cover" shrink hexpand vexpand></gtkpicture>
  </gtkstack>
</gtkpressable>
