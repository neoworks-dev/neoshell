<script lang="ts">
  import FillMeter from '../../lib/FillMeter.svelte'
  import {
    compactDetailOf,
    headlineCaptionOf,
    headlineOf,
    limitNoteOf,
    meterFractionOf,
    meterToneOf,
    percentOfWindow,
    resetLineOf,
    todayLineOf,
  } from './display'
  import type { AgentSummary } from './summary'

  // One agent's usage window: its name, how full the window is, when it
  // resets and what it has used today. The compact form is a row of a small
  // card; the full one is a column with the headline large, and adds the
  // plan's weekly limit where the agent reports one.

  let {
    agent,
    now,
    trackWidth,
    compact,
  }: {
    agent: AgentSummary
    now: number
    trackWidth: number
    compact: boolean
  } = $props()

  const usageWindow = $derived(agent.window)
  const weekly = $derived(agent.weekly)
  const tone = $derived(meterToneOf(percentOfWindow(usageWindow)))
</script>

{#if compact}
  <gtkbox class="usage-agent" orientation="vertical" spacing={3} tooltip={limitNoteOf(usageWindow)}>
    <gtkbox orientation="horizontal" spacing={6}>
      <gtklabel class="card-title" hexpand halign="start" ellipsize="end">{agent.name}</gtklabel>
      <gtklabel class="card-title" tabular halign="end">{headlineOf(usageWindow)}</gtklabel>
    </gtkbox>
    <FillMeter fraction={meterFractionOf(usageWindow)} width={trackWidth} {tone} />
    <gtklabel class="card-hint" halign="start" ellipsize="end">{compactDetailOf(agent, now)}</gtklabel>
  </gtkbox>
{:else}
  <gtkbox class="usage-agent" orientation="vertical" spacing={4} hexpand tooltip={limitNoteOf(usageWindow)}>
    <gtkbox orientation="horizontal" spacing={6}>
      <gtklabel class="card-title" halign="start" ellipsize="end">{agent.name}</gtklabel>
      {#if agent.plan !== ''}
        <gtklabel class="usage-plan" halign="start" valign="center">{agent.plan}</gtklabel>
      {/if}
    </gtkbox>
    <gtkbox orientation="horizontal" spacing={6}>
      <gtklabel class="card-reading compact" tabular halign="start">{headlineOf(usageWindow)}</gtklabel>
      <gtklabel class="card-hint usage-caption" halign="start" valign="end" ellipsize="end">
        {headlineCaptionOf(usageWindow, agent)}
      </gtklabel>
    </gtkbox>
    <FillMeter fraction={meterFractionOf(usageWindow)} width={trackWidth} {tone} />
    <gtklabel class="card-hint" halign="start" ellipsize="end">{resetLineOf(usageWindow, now)}</gtklabel>
    <gtklabel class="card-hint" halign="start" ellipsize="end">{todayLineOf(agent)}</gtklabel>
    {#if weekly !== null}
      <gtkbox orientation="horizontal" spacing={6}>
        <gtklabel class="card-hint" halign="start">{weekly.label}</gtklabel>
        <gtklabel class="card-hint" tabular hexpand halign="end">{weekly.percent}%</gtklabel>
      </gtkbox>
      <FillMeter fraction={meterFractionOf(weekly)} width={trackWidth} tone={meterToneOf(weekly.percent)} />
    {/if}
  </gtkbox>
{/if}
