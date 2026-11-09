<script lang="ts">
  import type { BusService } from './lib/bus'
  import type { ViewRegistry } from './host/plugins/views'
  import AiUsage from './extensions/aiusage/AiUsage.svelte'
  import Containers from './extensions/containers/Containers.svelte'
  import Email from './extensions/email/Email.svelte'
  import Gallery from './extensions/gallery/Gallery.svelte'
  import { MAX_UNIT_PX, sizePx, spanOf } from './extensions/neoshell/grid'
  import { remoteView } from './host/clients/remoteView'

  // The cards of the Containers, AI usage, Email and Gallery extensions: each
  // size in the shell's own process, one of them again as its client, and
  // each Settings page as its client. The data is smokeCards.ts's.

  const CARD_SIZES = ['small', 'medium', 'large']

  const RemoteAiUsageCard = remoteView('aiusage', 'card')
  const RemoteAiUsageSettings = remoteView('aiusage', 'settings')
  const RemoteContainersCard = remoteView('containers', 'card')
  const RemoteContainersSettings = remoteView('containers', 'settings')
  const RemoteEmailCard = remoteView('email', 'card')
  const RemoteEmailSettings = remoteView('email', 'settings')
  const RemoteGalleryCard = remoteView('gallery', 'card')
  const RemoteGallerySettings = remoteView('gallery', 'settings')

  let { bus, registry }: { bus: BusService; registry: ViewRegistry } = $props()

  function boxFor(size: string): { size: string; width: number; height: number } {
    const box = sizePx(MAX_UNIT_PX, spanOf(size))
    return { size, width: box.width, height: box.height }
  }
</script>

<gtkbox orientation="vertical" spacing={12} valign="start">
  <gtkbox orientation="horizontal" spacing={12} valign="start">
    {#each CARD_SIZES as size (size)}
      {@const box = boxFor(size)}
      <gtkbox width={box.width} height={box.height} valign="start">
        <Containers {bus} {registry} args={box} id={`smoke.containers.${size}`} />
      </gtkbox>
    {/each}
    <gtkbox class="smoke-remote-containers-card" width={boxFor('medium').width} height={boxFor('medium').height} valign="start">
      <RemoteContainersCard {bus} {registry} args={boxFor('medium')} id="smoke.containers.remote" />
    </gtkbox>
  </gtkbox>
  <gtkbox orientation="horizontal" spacing={12} valign="start">
    {#each CARD_SIZES as size (size)}
      {@const box = boxFor(size)}
      <gtkbox width={box.width} height={box.height} valign="start">
        <AiUsage {bus} {registry} args={box} id={`smoke.aiusage.${size}`} />
      </gtkbox>
    {/each}
    <gtkbox class="smoke-remote-aiusage-card" width={boxFor('medium').width} height={boxFor('medium').height} valign="start">
      <RemoteAiUsageCard {bus} {registry} args={boxFor('medium')} id="smoke.aiusage.remote" />
    </gtkbox>
  </gtkbox>
  <gtkbox orientation="horizontal" spacing={12} valign="start">
    {#each CARD_SIZES as size (size)}
      {@const box = boxFor(size)}
      <gtkbox width={box.width} height={box.height} valign="start">
        <Email {bus} {registry} args={box} id={`smoke.email.${size}`} />
      </gtkbox>
    {/each}
    <gtkbox class="smoke-remote-email-card" width={boxFor('medium').width} height={boxFor('medium').height} valign="start">
      <RemoteEmailCard {bus} {registry} args={boxFor('medium')} id="smoke.email.remote" />
    </gtkbox>
  </gtkbox>
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
    <RemoteContainersSettings {bus} {registry} args={{}} id="smoke.containers.settings" />
    <RemoteAiUsageSettings {bus} {registry} args={{}} id="smoke.aiusage.settings" />
    <RemoteEmailSettings {bus} {registry} args={{}} id="smoke.email.settings" />
  </gtkbox>
</gtkbox>
