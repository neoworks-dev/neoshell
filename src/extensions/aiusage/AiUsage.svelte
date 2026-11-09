<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { widgetBoxOf } from '../../lib/widget'
  import AgentMeter from './AgentMeter.svelte'
  import HourlyBars from './HourlyBars.svelte'
  import SessionRow from './SessionRow.svelte'
  import { sessionCountLineOf, shownAgentsOf } from './display'
  import type { AgentSummary } from './summary'
  import { aiUsageStateOf } from './topic'
  import type { AiUsageState } from './topic'
  import { HOURS_SHOWN, formatTokens } from './windows'

  // The desktop AI usage card in the three widget sizes:
  //
  //   small (2x2)   each agent's window as a row: how full, when it resets
  //   medium (4x2)  a column per agent, with the headline large
  //   large (4x4)   the columns, the last hours as bars, and the live sessions
  //
  // Claude Code's window is counted from its logs and measured against a
  // limit from the settings; Codex reports the plan's own limits.

  // The card's padding plus its border, on each side.
  const CARD_INSET_PX = 15
  const COLUMN_GAP_PX = 16
  const CLOCK_TICK_MS = 30_000
  const BARS_HEIGHT_PX = 34
  const LARGE_SESSIONS = 3
  const MEDIUM_SESSIONS = 2
  const SINGLE_COLUMN_PX = 170

  let { bus, args }: ViewProps = $props()

  let current = $state<AiUsageState | null>(null)
  let now = $state(Date.now())

  const box = $derived(widgetBoxOf(args))
  const agents = $derived(agentsOf(current))
  const innerWidth = $derived(Math.max(60, box.width - 2 * CARD_INSET_PX))
  const columnWidth = $derived(columnWidthOf(innerWidth, agents.length))
  const mediumColumnWidth = $derived(mediumColumnWidthOf(columnWidth, agents.length))
  const hourly = $derived(combinedHours(agents))
  const sessions = $derived(sessionsOf(current))
  const looking = $derived(current === null || (current.scanning && agents.length === 0))
  const nothingFound = $derived(current !== null && !current.scanning && agents.length === 0)
  const sessionDotClass = $derived(sessionDotClassOf(sessions))
  const todayTotal = $derived(agents.reduce((total, agent) => total + agent.today.tokens, 0))

  $effect(() =>
    subscribeTo(bus, 'aiusage.state', (message) => {
      current = aiUsageStateOf(message.data)
    }),
  )

  // Countdowns say how long is left, so the card re-renders on a timer even
  // when nothing new arrives.
  $effect(() => {
    const timer = setInterval(() => {
      now = Date.now()
    }, CLOCK_TICK_MS)
    return () => {
      clearInterval(timer)
    }
  })

  function agentsOf(state: AiUsageState | null): AgentSummary[] {
    if (state === null) {
      return []
    }
    return shownAgentsOf(state.agents)
  }

  function columnWidthOf(width: number, count: number): number {
    const columns = Math.max(1, count)
    return Math.floor((width - (columns - 1) * COLUMN_GAP_PX) / columns)
  }

  // A lone agent leaves room for its sessions beside it.
  function mediumColumnWidthOf(width: number, count: number): number {
    if (count === 1) {
      return SINGLE_COLUMN_PX
    }
    return width
  }

  function combinedHours(shown: AgentSummary[]): number[] {
    const hours = Array.from({ length: HOURS_SHOWN }, () => 0)
    for (const agent of shown) {
      agent.hourly.forEach((count, index) => {
        hours[index] += count
      })
    }
    return hours
  }

  function sessionsOf(state: AiUsageState | null): AiUsageState['sessions'] {
    if (state === null) {
      return []
    }
    return state.sessions
  }

  // Green and breathing while any agent is working, grey otherwise.
  function sessionDotClassOf(live: AiUsageState['sessions']): string {
    if (live.some((session) => session.status === 'working')) {
      return 'tone-dot status-dot tone-success pulse'
    }
    return 'tone-dot status-dot tone-neutral'
  }

  function openSettings(): void {
    bus.publish('settings:open', { section: 'aiusage' })
  }
</script>

{#snippet notice(icon: string, title: string, hint: string)}
  <gtkbox class="container-notice" orientation="vertical" spacing={4} halign="center" valign="center" vexpand>
    <gtkicon {icon} size={26}></gtkicon>
    <gtklabel class="card-title">{title}</gtklabel>
    <gtklabel class="card-hint" wrap justify="center" lines={4} ellipsize="end">{hint}</gtklabel>
  </gtkbox>
{/snippet}

<gtkbox class="card" orientation="vertical" spacing={10} hexpand vexpand>
  {#if looking}
    <gtkbox class="container-notice" orientation="vertical" spacing={6} halign="center" valign="center" vexpand>
      <gtkspinner spinning></gtkspinner>
      <gtklabel class="card-hint">Reading agent logs…</gtklabel>
    </gtkbox>
  {:else if nothingFound}
    {@render notice('utilities-terminal-symbolic', 'No agent logs found', 'Claude Code and Codex keep their logs under your home folder.')}
    <gtkbutton class="picture-link" frame={false} halign="center" onclicked={openSettings}>Choose where to look</gtkbutton>
  {:else if box.size === 'small'}
    <gtklabel class="card-title" halign="start">AI usage</gtklabel>
    <gtkbox orientation="vertical" spacing={10} vexpand valign="center">
      {#each agents as agent (agent.id)}
        <AgentMeter {agent} {now} trackWidth={innerWidth} compact={true} />
      {/each}
    </gtkbox>
  {:else if box.size === 'medium'}
    <gtkbox orientation="horizontal" spacing={COLUMN_GAP_PX} vexpand>
      {#each agents as agent (agent.id)}
        <gtkbox orientation="vertical" width={mediumColumnWidth}>
          <AgentMeter {agent} {now} trackWidth={mediumColumnWidth} compact={false} />
        </gtkbox>
      {/each}
      {#if agents.length === 1}
        <gtkbox orientation="vertical" spacing={2} hexpand valign="center">
          {#each sessions.slice(0, MEDIUM_SESSIONS) as session (session.agent + session.id)}
            <SessionRow {session} compact={true} showAgent={false} />
          {:else}
            <gtklabel class="card-hint" halign="start">No agent is running right now.</gtklabel>
          {/each}
        </gtkbox>
      {/if}
    </gtkbox>
    {#if agents.length > 1}
      <gtkbox orientation="horizontal" spacing={6} valign="end">
        <gtkbox class={sessionDotClass} valign="center"></gtkbox>
        <gtklabel class="card-hint" halign="start">{sessionCountLineOf(sessions)}</gtklabel>
      </gtkbox>
    {/if}
  {:else}
    <gtkbox orientation="horizontal" spacing={8}>
      <gtklabel class="card-title" hexpand halign="start">AI usage</gtklabel>
      <gtklabel class="card-hint" halign="end">{formatTokens(todayTotal)} tokens today</gtklabel>
    </gtkbox>
    <gtkbox orientation="horizontal" spacing={COLUMN_GAP_PX}>
      {#each agents as agent (agent.id)}
        <gtkbox orientation="vertical" width={columnWidth}>
          <AgentMeter {agent} {now} trackWidth={columnWidth} compact={false} />
        </gtkbox>
      {/each}
    </gtkbox>
    <gtkbox orientation="vertical" spacing={4}>
      <gtklabel class="card-hint" halign="start">Last 12 hours</gtklabel>
      <HourlyBars hours={hourly} height={BARS_HEIGHT_PX} width={innerWidth} />
    </gtkbox>
    <gtkbox orientation="vertical" spacing={2} vexpand valign="start">
      {#each sessions.slice(0, LARGE_SESSIONS) as session (session.agent + session.id)}
        <SessionRow {session} compact={false} showAgent={agents.length > 1} />
      {:else}
        <gtklabel class="card-hint" halign="start">No agent is running right now.</gtklabel>
      {/each}
    </gtkbox>
  {/if}
</gtkbox>
