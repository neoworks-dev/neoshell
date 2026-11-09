<script lang="ts">
  // One figure with its caption, as the large cards lay them out in a grid.

  let { value, label, hint = '' }: { value: string; label: string; hint?: string } = $props()
</script>

<gtkbox orientation="vertical" spacing={1} hexpand halign="fill">
  <gtklabel class="gh-stat-value" tabular halign="start" ellipsize="end">{value}</gtklabel>
  <gtklabel class="card-hint" halign="start" ellipsize="end">{label}</gtklabel>
  {#if hint !== ''}
    <gtklabel class="card-hint gh-stat-hint" halign="start" ellipsize="end">{hint}</gtklabel>
  {/if}
</gtkbox>
