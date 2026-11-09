<script lang="ts">
  import { contextLabelOf, sessionDetailOf } from './display'
  import { AGENT_NAMES } from './summary'
  import type { SessionSummary } from './summary'

  // One live session: a dot that pulses while the agent is working, the
  // session's title (or project) and what it is doing now, and on the wide
  // form the model and how large the conversation has grown. It slides open
  // when it first appears.

  const SLIDE_MS = 260
  const SLIDE_DELAY_MS = 30

  let {
    session,
    compact,
    showAgent,
  }: {
    session: SessionSummary
    // Title and detail only: the form of a narrow column.
    compact: boolean
    // Name the agent beside the model; pointless when only one is shown.
    showAgent: boolean
  } = $props()

  let shown = $state(false)

  const title = $derived(titleOf(session))
  const dotClass = $derived(dotClassOf(session))
  const detail = $derived(detailOf(session))
  const modelLine = $derived(modelLineOf(session, showAgent))

  $effect(() => {
    const timer = setTimeout(() => {
      shown = true
    }, SLIDE_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  })

  function titleOf(current: SessionSummary): string {
    if (current.title !== '') {
      return current.title
    }
    if (current.project !== '') {
      return current.project
    }
    return AGENT_NAMES[current.agent]
  }

  function dotClassOf(current: SessionSummary): string {
    if (current.status === 'working') {
      return 'tone-dot status-dot tone-success pulse'
    }
    return 'tone-dot status-dot tone-neutral'
  }

  // With no title the project already heads the row.
  function detailOf(current: SessionSummary): string {
    if (current.title === '') {
      return sessionDetailOf(current.what, '', current.branch)
    }
    return sessionDetailOf(current.what, current.project, current.branch)
  }

  function modelLineOf(current: SessionSummary, withAgent: boolean): string {
    if (!withAgent) {
      return current.model
    }
    return [AGENT_NAMES[current.agent], current.model].filter((part) => part !== '').join(' · ')
  }
</script>

<gtkrevealer reveal={shown} transition="slide-down" duration={SLIDE_MS}>
  <gtkbox class="usage-session" orientation="horizontal" spacing={10}>
    <gtkbox class={dotClass} valign="center"></gtkbox>
    <gtkbox orientation="vertical" hexpand valign="center">
      <gtkbox orientation="horizontal" spacing={8}>
        <gtklabel class="container-name" hexpand halign="start" ellipsize="end" xalign={0}>{title}</gtklabel>
        {#if !compact}
          <gtklabel class="card-range" halign="end">{contextLabelOf(session.contextTokens)}</gtklabel>
        {/if}
      </gtkbox>
      <gtkbox orientation="horizontal" spacing={8}>
        <gtklabel class="card-range" hexpand halign="start" ellipsize="end" xalign={0}>{detail}</gtklabel>
        {#if !compact}
          <gtklabel class="card-range usage-model" halign="end">{modelLine}</gtklabel>
        {/if}
      </gtkbox>
    </gtkbox>
  </gtkbox>
</gtkrevealer>
