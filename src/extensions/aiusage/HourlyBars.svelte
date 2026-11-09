<script lang="ts">
  import { formatTokens } from './windows'

  // Fresh tokens in each of the last hours, as bars that grow to their height
  // when the card appears or the numbers change (the stylesheet's min-height
  // transition). The last bar is the hour in progress.

  const GROW_DELAY_MS = 40
  const BAR_WIDTH_PX = 14

  let {
    hours,
    height,
    width,
  }: {
    hours: number[]
    height: number
    width: number
  } = $props()

  let grown = $state(false)

  const peak = $derived(Math.max(1, ...hours))
  const gap = $derived(Math.max(2, Math.floor((width - hours.length * BAR_WIDTH_PX) / Math.max(1, hours.length - 1))))

  $effect(() => {
    const timer = setTimeout(() => {
      grown = true
    }, GROW_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  })

  function barHeightOf(count: number, isGrown: boolean): number {
    if (!isGrown) {
      return 0
    }
    if (count <= 0) {
      return 2
    }
    return Math.max(3, Math.round((count / peak) * height))
  }

  function barClassOf(index: number): string {
    if (index === hours.length - 1) {
      return 'usage-bar usage-bar-now'
    }
    return 'usage-bar'
  }
</script>

<gtkbox orientation="horizontal" spacing={gap} {height} valign="end" halign="start">
  {#each hours as count, index (index)}
    <gtkbox
      class={barClassOf(index)}
      width={BAR_WIDTH_PX}
      valign="end"
      tooltip={`${formatTokens(count)} tokens`}
      css="min-height: {barHeightOf(count, grown)}px;"
    ></gtkbox>
  {/each}
</gtkbox>
