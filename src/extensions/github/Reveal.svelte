<script lang="ts">
  import type { Snippet } from 'svelte'

  // Slides its content open after `delay`, so a list's rows arrive one behind
  // the other.

  const SLIDE_MS = 260

  let { delay = 0, children }: { delay?: number; children: Snippet } = $props()

  let shown = $state(false)

  $effect(() => {
    const timer = setTimeout(() => {
      shown = true
    }, delay)
    return () => {
      clearTimeout(timer)
    }
  })
</script>

<gtkrevealer reveal={shown} transition="slide-down" duration={SLIDE_MS}>
  {@render children()}
</gtkrevealer>
