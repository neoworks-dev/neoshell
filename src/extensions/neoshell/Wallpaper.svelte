<script lang="ts">
  import type Gdk from 'gi://Gdk?version=4.0'
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { monitorSizeOf } from '../../lib/placement'
  import { recordOf, stringOf } from '../../lib/record'
  import { createLivePlayer } from './livePlayer'
  import type { LivePlayer } from './livePlayer'
  import {
    DEFAULT_LIVE_OPTIONS,
    fullscreenShowing,
    isVideoPath,
    liveOptionsOf,
    onBatteryPower,
    shouldPlay,
  } from './liveWallpaper'
  import { wallpaperTexture } from './wallpaperImage'
  import type { PixelSize } from './wallpaperImage'

  // The desktop background: the configured wallpaper, a flat dark fill when
  // none is set.
  //
  // A still image is decoded at the size that covers this view's output
  // (wallpaperImage.ts), once per output size.
  //
  // A video path is a live wallpaper: a looping, muted player rendered into a
  // paintable the same picture shows. It holds still while a fullscreen window
  // is on screen and, if configured, while the machine is on battery — there
  // is nothing to look at in the first case and every frame costs in the
  // second. Both rules and the playback speed live under
  // appearance.liveWallpaper.

  let { bus, args }: ViewProps = $props()

  let wallpaperPath = $state('')
  let options = $state(DEFAULT_LIVE_OPTIONS)
  let workspaces = $state.raw<unknown>(null)
  let monitors = $state.raw<unknown>(null)
  let battery = $state.raw<unknown>(null)
  let player = $state.raw<LivePlayer | null>(null)

  $effect(() =>
    subscribeTo(bus, 'config', (message) => {
      wallpaperPath = pathOf(message.data)
      options = liveOptionsOf(message.data)
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'hypr.workspaces', (message) => {
      workspaces = message.data
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'hypr.monitors', (message) => {
      monitors = message.data
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'system.battery', (message) => {
      battery = message.data
    }),
  )

  const isLive = $derived(isVideoPath(wallpaperPath))

  // Kept as plain numbers so a hypr.monitors republish that leaves this
  // output's size alone does not decode the image again.
  const outputWidth = $derived(outputSizeOf(monitors).width)
  const outputHeight = $derived(outputSizeOf(monitors).height)
  const still = $derived.by(() => stillOf(wallpaperPath, isLive, outputWidth, outputHeight))
  const playing = $derived(
    shouldPlay(options, fullscreenShowing(workspaces, monitors), onBatteryPower(battery)),
  )

  // One player per path. It is created when the path turns into a video and
  // torn down when it changes or the view goes, so a wallpaper switch never
  // leaves a pipeline decoding into nothing.
  $effect(() => {
    if (!isLive) {
      player = null
      return
    }
    const next = createLivePlayer(wallpaperPath)
    player = next
    return () => {
      next.dispose()
    }
  })

  $effect(() => {
    if (player !== null) {
      player.setPlaying(playing)
    }
  })

  $effect(() => {
    if (player !== null) {
      player.setRate(options.speed)
    }
  })

  function pathOf(snapshot: unknown): string {
    const appearance = recordOf(recordOf(snapshot).appearance)
    if (typeof appearance.wallpaper === 'string') {
      return appearance.wallpaper
    }
    return ''
  }

  function outputSizeOf(snapshot: unknown): PixelSize {
    const size = monitorSizeOf(snapshot, stringOf(recordOf(args).monitor))
    if (size === null) {
      return { width: 0, height: 0 }
    }
    return size
  }

  // Waits for the output's size rather than decoding at the photo's own.
  function stillOf(path: string, live: boolean, width: number, height: number): Gdk.Texture | null {
    if (path === '' || live || width === 0 || height === 0) {
      return null
    }
    return wallpaperTexture(path, { width, height })
  }
</script>

<gtkbox class="wallpaper" hexpand vexpand>
  {#if player !== null}
    <gtkpicture paintable={player.paintable} fit="cover" hexpand vexpand></gtkpicture>
  {:else if still !== null}
    <gtkpicture paintable={still} fit="cover" hexpand vexpand></gtkpicture>
  {/if}
</gtkbox>
