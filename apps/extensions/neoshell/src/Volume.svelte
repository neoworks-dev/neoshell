<script lang="ts">
  import { recordOf } from './lib'
  import type { BusLike } from './lib'

  // Volume indicator, fed by the retained system.volume topic (0..1 + muted).

  let { bus }: { bus: BusLike } = $props()

  let volume = $state(-1)
  let muted = $state(false)

  $effect(() => {
    return bus.subscribe('system.volume', (message) => {
      const data = recordOf(message.data)
      if (typeof data.volume === 'number') {
        volume = data.volume
      }
      muted = data.muted === true
    })
  })
</script>

{#if volume >= 0}
  <div class="flex items-center gap-1.5 text-base-content/80 tabular-nums">
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" class="shrink-0">
      <path d="M2 5h2.5L8 2v10L4.5 9H2z" fill="currentColor" />
      {#if !muted && volume > 0}
        <path
          d="M10 4.5a3.5 3.5 0 0 1 0 5"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      {/if}
      {#if !muted && volume > 0.6}
        <path
          d="M11.8 3a6 6 0 0 1 0 8"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      {/if}
      {#if muted}
        <path
          d="M10 5l4 4M14 5l-4 4"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      {/if}
    </svg>
    {#if muted}
      <span class="text-base-content/40">muted</span>
    {:else}
      <span>{Math.round(volume * 100)}%</span>
    {/if}
  </div>
{/if}
