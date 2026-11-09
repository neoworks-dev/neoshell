<script lang="ts">
  import { monthLabelsOf, monthSegmentsOf, pluralize, shortDate } from './lib'
  import type { ContributionDay } from './model'

  // The contribution graph: one column per week, Sunday at the top. The cells
  // fade in column by column the first time it is drawn. GTK CSS has no
  // percentages, so the caller passes the cell size and the columns that fit.

  const REVEAL_STEP_MS = 18

  let {
    columns,
    cellSize,
    gap,
    showMonths = false,
  }: {
    columns: ContributionDay[][]
    cellSize: number
    gap: number
    showMonths?: boolean
  } = $props()

  let revealedColumns = $state(0)

  const segments = $derived(monthSegmentsOf(monthLabelsOf(columns), columns.length))
  const lastDate = $derived(lastDateOf(columns))

  $effect(() => {
    const timer = setInterval(() => {
      revealedColumns += 1
      if (revealedColumns > columns.length) {
        clearInterval(timer)
      }
    }, REVEAL_STEP_MS)
    return () => {
      clearInterval(timer)
    }
  })

  // A column's width plus the gap after it; the last has no gap after it.
  function segmentWidth(columnCount: number, index: number): number {
    const width = columnCount * (cellSize + gap)
    if (index === segments.length - 1) {
      return width - gap
    }
    return width
  }

  function lastDateOf(weeks: ContributionDay[][]): string {
    const lastWeek = weeks[weeks.length - 1]
    if (lastWeek === undefined || lastWeek.length === 0) {
      return ''
    }
    return lastWeek[lastWeek.length - 1].date
  }

  function cellClass(day: ContributionDay, columnIndex: number): string {
    let classes = `gh-cell gh-level-${day.level}`
    if (columnIndex < revealedColumns) {
      classes += ' gh-shown'
    }
    if (day.date === lastDate) {
      classes += ' gh-today'
    }
    return classes
  }

  function tooltipOf(day: ContributionDay): string {
    if (day.count === 0) {
      return `No contributions on ${shortDate(day.date)}`
    }
    return `${pluralize(day.count, 'contribution')} on ${shortDate(day.date)}`
  }
</script>

<gtkbox orientation="vertical" spacing={4}>
  {#if showMonths}
    <gtkbox orientation="horizontal">
      {#each segments as segment, index (segment.label + segment.columns)}
        <gtklabel
          class="card-hint gh-month"
          halign="start"
          xalign={0}
          ellipsize="end"
          width={segmentWidth(segment.columns, index)}
        >
          {segment.label}
        </gtklabel>
      {/each}
    </gtkbox>
  {/if}
  <gtkbox orientation="horizontal" spacing={gap}>
    {#each columns as column, columnIndex (column[0].date)}
      <gtkbox orientation="vertical" spacing={gap} valign="start">
        {#each column as day (day.date)}
          <gtkbox
            class={cellClass(day, columnIndex)}
            width={cellSize}
            height={cellSize}
            tooltip={tooltipOf(day)}
          ></gtkbox>
        {/each}
      </gtkbox>
    {/each}
  </gtkbox>
</gtkbox>
