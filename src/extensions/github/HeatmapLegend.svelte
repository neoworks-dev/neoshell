<script lang="ts">
  // "Less ▪▪▪▪▪ More", the key to the graph's five shades.

  const LEVELS = [0, 1, 2, 3, 4]
  const SWATCH_PX = 9
</script>

<gtkbox orientation="horizontal" spacing={3} halign="end" valign="center">
  <gtklabel class="card-hint gh-legend" valign="center">Less</gtklabel>
  {#each LEVELS as level (level)}
    <gtkbox class="gh-cell gh-shown gh-level-{level}" width={SWATCH_PX} height={SWATCH_PX} valign="center"></gtkbox>
  {/each}
  <gtklabel class="card-hint gh-legend" valign="center">More</gtklabel>
</gtkbox>
