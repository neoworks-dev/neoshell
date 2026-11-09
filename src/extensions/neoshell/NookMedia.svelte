<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import { recordOf, stringOf } from '../../lib/record'
  import type { ViewProps } from '../../host/plugins/views'

  // The Nook's media widget: sleeve, title, artist and transport for the
  // current MPRIS player. Reads media.player itself, so the notch only places
  // it; the sleeve is media.artwork's picture handle.

  interface Track {
    status: string
    title: string
    artist: string
    album: string
  }

  const ART_SIZE = 88
  const EMPTY_TRACK: Track = { status: '', title: '', artist: '', album: '' }

  let { bus }: ViewProps = $props()

  let track = $state<Track>(EMPTY_TRACK)
  let artHandle = $state('')

  const playing = $derived(track.status === 'Playing')
  const hasTrack = $derived(track.title !== '' && track.status !== 'Stopped')

  $effect(() =>
    subscribeTo(bus, 'media.player', (message) => {
      track = trackOf(recordOf(message.data))
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'media.artwork', (message) => {
      artHandle = stringOf(recordOf(message.data).handle)
    }),
  )

  function trackOf(record: Record<string, unknown>): Track {
    return {
      status: stringOf(record.status),
      title: stringOf(record.title),
      artist: stringOf(record.artist),
      album: stringOf(record.album),
    }
  }

  function playPauseIcon(isPlaying: boolean): string {
    if (isPlaying) {
      return 'media-playback-pause-symbolic'
    }
    return 'media-playback-start-symbolic'
  }

  function send(action: string): void {
    void bus.call(action, {})
  }
</script>

<gtkbox class="nook-media" orientation="horizontal" spacing={14} hexpand>
  <gtkbox
    class="nook-media-art"
    css="min-width: {ART_SIZE}px; min-height: {ART_SIZE}px;"
    valign="center"
    hexpand={false}
    homogeneous
    clip
  >
    {#if artHandle !== ''}
      <gtkpicture handle={artHandle} fit="cover" shrink width={ART_SIZE} height={ART_SIZE}></gtkpicture>
    {:else}
      <gtkicon icon="audio-x-generic-symbolic" size={28} halign="center" valign="center"></gtkicon>
    {/if}
  </gtkbox>

  <gtkbox orientation="vertical" spacing={2} hexpand valign="center">
    {#if hasTrack}
      <gtklabel class="nook-media-title" halign="start" wrap lines={2} ellipsize="end">
        {track.title}
      </gtklabel>
      {#if track.album !== ''}
        <gtklabel class="nook-media-album" halign="start" ellipsize="end">{track.album}</gtklabel>
      {/if}
      <gtklabel class="nook-media-artist" halign="start" ellipsize="end">{track.artist}</gtklabel>
    {:else}
      <gtklabel class="nook-media-title" halign="start">Nothing playing</gtklabel>
    {/if}
    <gtkbox class="nook-media-controls" orientation="horizontal" spacing={14} halign="start">
      {@render control('media-skip-backward-symbolic', 'media:previous', 'Previous')}
      {@render control(playPauseIcon(playing), 'media:playPause', 'Play or pause')}
      {@render control('media-skip-forward-symbolic', 'media:next', 'Next')}
    </gtkbox>
  </gtkbox>
</gtkbox>

{#snippet control(icon: string, action: string, label: string)}
  <gtkbutton
    class="nook-control"
    frame={false}
    tooltip={label}
    sensitive={hasTrack}
    onclicked={() => send(action)}
  >
    <gtkicon {icon} size={16}></gtkicon>
  </gtkbutton>
{/snippet}
