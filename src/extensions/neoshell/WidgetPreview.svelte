<script lang="ts">
  import type { BusService } from '../../lib/bus'
  import type { ViewRegistry } from '../../host/plugins/views'
  import { MAX_UNIT_PX, sizePx, spanOf } from './grid'

  // A gallery tile showing the real widget, mounted at its design size and
  // scaled down to fit. Previews are live because a widget's whole point is the
  // data in it — a greyed-out shape says nothing about which one to pick.
  //
  // The preview mounts under a "preview:" id, so anything a widget keys by
  // instance (its own settings, its own topic) stays separate from the cards
  // actually on the desktop.
  //
  // GTK CSS has no transform-origin, and a scaled widget keeps the allocation
  // it had — so the box is sized to what the scaled card occupies and the
  // wrapper clips whatever the transform pushes outside it.

  let {
    bus,
    registry,
    generation,
    type,
    size,
    width,
  }: {
    bus: BusService
    registry: ViewRegistry
    generation: number
    type: string
    size: string
    width: number
  } = $props()

  const View = $derived(viewFor(type, generation))
  const box = $derived(sizePx(MAX_UNIT_PX, spanOf(size)))
  const scale = $derived(width / box.width)

  function viewFor(widgetType: string, _generation: number) {
    return registry.resolve(widgetType)
  }

  // The scaled card is anchored to the wrapper's top-left by shifting it back
  // by half of what scaling about the centre moved it. Fixed-point, so a
  // value near zero never comes out in exponent notation, which a client's
  // inline style may not carry.
  function scaleCss(factor: number, unscaled: { width: number; height: number }): string {
    const dx = ((unscaled.width * (factor - 1)) / 2).toFixed(3)
    const dy = ((unscaled.height * (factor - 1)) / 2).toFixed(3)
    return `transform: translate(${dx}px, ${dy}px) scale(${factor.toFixed(4)});`
  }
</script>

<!-- A scrolled window that never scrolls: unlike a box, it asks for the size
     it is given instead of its child's, which is still the unscaled card. -->
<gtkscrolledwindow
  class="gallery-preview"
  hscroll="external"
  vscroll="external"
  min-content-width={width}
  max-content-width={width}
  min-content-height={Math.round(box.height * scale)}
  max-content-height={Math.round(box.height * scale)}
  frame={false}
  halign="start"
  valign="start"
>
  {#if View !== undefined}
    <!-- Held to the card's design width, the way the desktop's slot holds
         it, so wrapping text wraps and the transform's arithmetic holds. -->
    <gtkclamp maximum={box.width} halign="start" valign="start" css={scaleCss(scale, box)}>
      <gtkbox width={box.width} height={box.height}>
        <View
          {bus}
          {registry}
          args={{ size, width: box.width, height: box.height }}
          id={`preview:${type}`}
        />
      </gtkbox>
    </gtkclamp>
  {/if}
</gtkscrolledwindow>
