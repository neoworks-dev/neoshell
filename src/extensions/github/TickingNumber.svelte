<script lang="ts">
  import { untrack } from 'svelte'
  import { groupThousands } from './lib'

  // A count that runs up to its value, and from the old value to a new one
  // when a refresh changes it.

  const DURATION_MS = 700
  const FRAME_MS = 32

  let {
    value,
    class: className = '',
    halign = 'start',
    suffix = '',
  }: { value: number; class?: string; halign?: string; suffix?: string } = $props()

  let shown = $state(0)

  $effect(() => {
    const target = value
    const from = untrack(() => shown)
    const startedAt = Date.now()
    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / DURATION_MS)
      shown = Math.round(from + (target - from) * easeOut(progress))
      if (progress >= 1) {
        clearInterval(timer)
      }
    }, FRAME_MS)
    return () => {
      clearInterval(timer)
    }
  })

  function easeOut(progress: number): number {
    return 1 - Math.pow(1 - progress, 3)
  }
</script>

<gtklabel class={className} tabular {halign}>{groupThousands(shown)}{suffix}</gtklabel>
