<script lang="ts">
  // A thin meter whose fill grows to its value: the bar starts empty and the
  // stylesheet's min-width transition (style.css, .fill-meter-bar) carries it
  // there, and again whenever the value changes. GTK CSS has no percentage
  // widths, so the card hands in the pixel width of the track.

  const FILL_DELAY_MS = 40
  const TRACK_HEIGHT_PX = 5

  let {
    fraction,
    width,
    tone = 'accent',
  }: {
    fraction: number
    width: number
    // accent | success | warning | error
    tone?: string
  } = $props()

  let shown = $state(0)

  const fillWidth = $derived(Math.round(Math.min(1, Math.max(0, shown)) * width))

  $effect(() => {
    const target = fraction
    const timer = setTimeout(() => {
      shown = target
    }, FILL_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  })
</script>

<gtkbox class="fill-meter" {width} height={TRACK_HEIGHT_PX} valign="center" clip>
  <gtkbox class="fill-meter-bar fill-meter-{tone}" halign="start" css="min-width: {fillWidth}px;"></gtkbox>
</gtkbox>
