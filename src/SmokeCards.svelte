<script lang="ts">
  import type { BusService } from './lib/bus'
  import type { ViewRegistry } from './host/plugins/views'
  import Gallery from './extensions/gallery/Gallery.svelte'
  import { MAX_UNIT_PX, sizePx, spanOf } from './extensions/neoshell/grid'
  import { remoteView } from './host/clients/remoteView'

  // The cards of the Containers, AI usage, Email and Gallery extensions: each
  // size in the shell's own process, one of them again as its client, and
  // each Settings page as its client. The data is smokeCards.ts's.

  const CARD_SIZES = ['small', 'medium', 'large']

  const RemoteGalleryCard = remoteView('gallery', 'card')
  const RemoteGallerySettings = remoteView('gallery', 'settings')

  let { bus, registry }: { bus: BusService; registry: ViewRegistry } = $props()

  function boxFor(size: string) {
    const box = sizePx(MAX_UNIT_PX, spanOf(size))
    return { size, width: box.width, height: box.height }
  }
</script>

<gtkbox orientation="vertical" spacing={12} valign="start">
  <gtkbox orientation="horizontal" spacing={12} valign="start">
    {#each CARD_SIZES as size (size)}
      {@const box = boxFor(size)}
      <gtkbox width={box.width} height={box.height} valign="start">
        <Gallery {bus} {registry} args={box} id={`smoke.gallery.${size}`} />
      </gtkbox>
    {/each}
    <gtkbox class="smoke-remote-gallery-card" width={boxFor('medium').width} height={boxFor('medium').height} valign="start">
      <RemoteGalleryCard {bus} {registry} args={boxFor('medium')} id="smoke.gallery.remote" />
    </gtkbox>
  </gtkbox>
  <gtkbox class="ui-light" orientation="vertical" width={720} valign="start">
    <RemoteGallerySettings {bus} {registry} args={{}} id="smoke.gallery.settings" />
  </gtkbox>
</gtkbox>
