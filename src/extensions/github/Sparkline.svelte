<script lang="ts">
  // Commits per day as thin bars. They rise in one after the other the first
  // time the chart is drawn.

  const REVEAL_STEP_MS = 30

  let {
    counts,
    areaHeight,
    barWidth = 6,
  }: { counts: number[]; areaHeight: number; barWidth?: number } = $props()

  let revealed = $state(0)

  const peak = $derived(Math.max(1, ...counts))

  $effect(() => {
    const timer = setInterval(() => {
      revealed += 1
      if (revealed > counts.length) {
        clearInterval(timer)
      }
    }, REVEAL_STEP_MS)
    return () => {
      clearInterval(timer)
    }
  })

  function barClass(count: number, index: number): string {
    let classes = 'gh-spark'
    if (count > 0) {
      classes += ' gh-spark-active'
    }
    if (index < revealed) {
      classes += ' gh-shown'
    }
    return classes
  }

  function barHeight(count: number): number {
    return Math.max(3, Math.round((count / peak) * areaHeight))
  }
</script>

<gtkbox orientation="horizontal" spacing={3} valign="end" height={areaHeight}>
  {#each counts as count, index (index)}
    <gtkbox
      class={barClass(count, index)}
      width={barWidth}
      height={barHeight(count)}
      valign="end"
      tooltip="{count} commits"
    ></gtkbox>
  {/each}
</gtkbox>
