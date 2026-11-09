<script lang="ts">
  import { attentionOf, stoppedLineOf, upCountOf } from './display'
  import { toneOf } from './parse'
  import type { ContainerItem, Counts } from './parse'

  // The headline: how many are up, one dot per container, and what needs
  // attention. Stacked on the small card; the wider cards put it in a column
  // beside the list.

  const MAX_DOTS = 14

  let { counts, items, stacked }: { counts: Counts; items: ContainerItem[]; stacked: boolean } = $props()

  const attention = $derived(attentionOf(counts))
  const stoppedLine = $derived(stoppedLineOf(counts))
  const dots = $derived(items.slice(0, MAX_DOTS))

  function dotClassOf(item: ContainerItem): string {
    const classes = ['tone-dot', 'status-dot', `tone-${toneOf(item.state)}`]
    if (item.state === 'starting') {
      classes.push('pulse')
    }
    return classes.join(' ')
  }
</script>

<gtkbox class="card-summary" orientation="vertical" spacing={6} vexpand>
  <gtkbox orientation="horizontal" spacing={6}>
    <gtkicon icon="package-x-generic-symbolic" size={14} valign="center"></gtkicon>
    <gtklabel class="card-title" halign="start">Containers</gtklabel>
  </gtkbox>
  <gtkbox orientation="horizontal" spacing={6} valign="end">
    <gtklabel class="card-reading" tabular halign="start">{upCountOf(counts)}</gtklabel>
    <gtklabel class="card-condition" halign="start" valign="end" margin-bottom={10}>running</gtklabel>
  </gtkbox>
  <gtkbox orientation="horizontal" spacing={4} halign="start">
    {#each dots as item (item.engine + item.id)}
      <gtkbox class={dotClassOf(item)} valign="center"></gtkbox>
    {/each}
  </gtkbox>
  <gtkbox orientation="vertical" valign="end" vexpand>
    <gtklabel class="container-attention attention-{attention.tone}" halign="start" ellipsize="end">{attention.text}</gtklabel>
    {#if stacked && stoppedLine !== ''}
      <gtklabel class="card-range" halign="start">{stoppedLine}</gtklabel>
    {/if}
  </gtkbox>
</gtkbox>
