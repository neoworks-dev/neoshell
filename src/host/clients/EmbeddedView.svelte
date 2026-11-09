<script lang="ts">
  import type { BusService } from '../../lib/bus'
  import type { ViewRegistry } from '../plugins/views'
  import { resolve } from '../../tree'

  // A view the host draws inside a client's <gtkembed>: resolved from the
  // registry like any view, so it may itself be another client's.

  let {
    bus,
    registry,
    type,
    args,
    id,
  }: { bus: BusService; registry: ViewRegistry; type: string; args: unknown; id: string } = $props()

  let generation = $state(0)

  $effect(() =>
    registry.onChange(() => {
      generation += 1
    }),
  )

  const View = $derived(resolve(registry, type, generation))
</script>

{#if View !== undefined}
  <View {bus} {registry} {args} {id} />
{/if}
