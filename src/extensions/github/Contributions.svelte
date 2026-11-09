<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { widgetBoxOf } from '../../lib/widget'
  import GithubCard from './GithubCard.svelte'
  import Heatmap from './Heatmap.svelte'
  import HeatmapLegend from './HeatmapLegend.svelte'
  import Stat from './Stat.svelte'
  import TickingNumber from './TickingNumber.svelte'
  import { Clock } from './clock.svelte'
  import {
    columnsThatFit,
    contributionsOf,
    groupThousands,
    lastWeeks,
    pluralize,
    relativeTime,
    shortDate,
    weeklyTotalsOf,
  } from './lib'
  import type { ContributionDay, ContributionsState } from './model'

  // The coding-activity card in the three widget sizes:
  //
  //   small (2x2)   the year's total, the streak and the last few weeks
  //   medium (4x2)  total and streak side by side over a wide graph
  //   large (4x4)   the graph with its months, four figures and the weekly totals
  //
  // The graph's cell size is a design measure per size; how many weeks fit is
  // worked out from the card's pixel width, since GTK CSS has no percentages.

  // The card's padding and border, either side.
  const CARD_INSET_PX = 30
  const WEEK_BAR_AREA_PX = 40
  const WEEKS_CHARTED = 24

  let { bus, args }: ViewProps = $props()

  let contributions = $state<ContributionsState | null>(null)
  const clock = new Clock()

  const box = $derived(widgetBoxOf(args))
  const innerWidth = $derived(Math.max(60, box.width - CARD_INSET_PX))
  const status = $derived(statusOf(contributions))
  const message = $derived(messageOf(contributions))
  const title = $derived(titleOf(contributions, box.size))
  const weekTotals = $derived(weekTotalsOf(contributions))

  $effect(() => clock.connect())
  $effect(() =>
    subscribeTo(bus, 'github.contributions', (incoming) => {
      contributions = contributionsOf(incoming.data)
    }),
  )

  function statusOf(current: ContributionsState | null): string {
    if (current === null) {
      return 'loading'
    }
    return current.status
  }

  function messageOf(current: ContributionsState | null): string {
    if (current === null) {
      return ''
    }
    return current.message
  }

  function titleOf(current: ContributionsState | null, size: string): string {
    if (current === null || current.login === '' || size === 'small') {
      return 'Coding activity'
    }
    return `@${current.login}`
  }

  function streakCaption(days: number): string {
    if (days === 1) {
      return 'day streak'
    }
    return 'days streak'
  }

  function weekTotalsOf(current: ContributionsState | null): number[] {
    if (current === null) {
      return []
    }
    return weeklyTotalsOf(lastWeeks(current.days, WEEKS_CHARTED))
  }

  function weeksFor(current: ContributionsState, cellSize: number, gap: number): ContributionDay[][] {
    return lastWeeks(current.days, columnsThatFit(innerWidth, cellSize, gap))
  }

  function bestDayValue(current: ContributionsState): string {
    if (current.bestDay === null) {
      return 'None yet'
    }
    return pluralize(current.bestDay.count, 'contribution')
  }

  function bestDayLabel(current: ContributionsState): string {
    if (current.bestDay === null) {
      return 'Best day'
    }
    return `Best day · ${shortDate(current.bestDay.date)}`
  }

  function barHeightOf(total: number): number {
    const peak = Math.max(1, ...weekTotals)
    return Math.max(2, Math.round((total / peak) * WEEK_BAR_AREA_PX))
  }
</script>

<GithubCard
  {bus}
  {title}
  icon="view-grid-symbolic"
  {status}
  {message}
  compact={box.size === 'small'}
>
  {#if contributions !== null}
    {#if box.size === 'small'}
      <gtkbox orientation="vertical" vexpand>
        <TickingNumber class="gh-total" value={contributions.total} />
        <gtklabel class="card-hint" halign="start">contributions in the last year</gtklabel>
        <gtkbox vexpand></gtkbox>
        <gtklabel class="gh-streak" halign="start" margin-bottom={6}>
          {pluralize(contributions.currentStreak, 'day')} streak
        </gtklabel>
        <Heatmap columns={weeksFor(contributions, 6, 2)} cellSize={6} gap={2} />
      </gtkbox>
    {:else if box.size === 'medium'}
      <gtkbox orientation="horizontal" spacing={16}>
        <gtkbox orientation="vertical" hexpand halign="start">
          <TickingNumber class="gh-total" value={contributions.total} />
          <gtklabel class="card-hint" halign="start">contributions in the last year</gtklabel>
        </gtkbox>
        <gtkbox orientation="vertical" halign="end">
          <TickingNumber class="gh-total-secondary" value={contributions.currentStreak} halign="end" />
          <gtklabel class="card-hint" halign="end">{streakCaption(contributions.currentStreak)}</gtklabel>
        </gtkbox>
      </gtkbox>
      <gtkbox vexpand></gtkbox>
      <Heatmap columns={weeksFor(contributions, 6, 3)} cellSize={6} gap={3} showMonths />
    {:else}
      <gtkbox orientation="vertical" halign="start">
        <TickingNumber class="gh-total" value={contributions.total} />
        <gtklabel class="card-hint" halign="start">contributions in the last year</gtklabel>
      </gtkbox>
      <Heatmap columns={weeksFor(contributions, 10, 3)} cellSize={10} gap={3} showMonths />
      <gtkbox orientation="horizontal">
        <gtklabel class="card-hint" hexpand halign="start">
          Updated {relativeTime(contributions.updatedAt, clock.now)}
        </gtklabel>
        <HeatmapLegend />
      </gtkbox>
      <gtkbox orientation="horizontal" homogeneous spacing={12}>
        <Stat value={pluralize(contributions.currentStreak, 'day')} label="Current streak" />
        <Stat value={pluralize(contributions.longestStreak, 'day')} label="Longest streak" />
      </gtkbox>
      <gtkbox orientation="horizontal" homogeneous spacing={12}>
        <Stat value={groupThousands(contributions.activeDays)} label="Active days" />
        <Stat value={bestDayValue(contributions)} label={bestDayLabel(contributions)} />
      </gtkbox>
      <gtkbox vexpand></gtkbox>
      <gtklabel class="card-hint" halign="start">Contributions per week, last {WEEKS_CHARTED} weeks</gtklabel>
      <gtkbox orientation="horizontal" spacing={3} valign="end" height={WEEK_BAR_AREA_PX}>
        {#each weekTotals as total, index (index)}
          <gtkbox
            class="gh-week-bar"
            hexpand
            valign="end"
            height={barHeightOf(total)}
            tooltip={pluralize(total, 'contribution')}
          ></gtkbox>
        {/each}
      </gtkbox>
    {/if}
  {/if}
</GithubCard>
