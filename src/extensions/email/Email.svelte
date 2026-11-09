<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { widgetBoxOf } from '../../lib/widget'
  import MailRow from './MailRow.svelte'
  import { allFailedOf, latestLineOf, problemOf, subjectOf, unreadLabelOf } from './display'
  import { inboxStateOf } from './topic'
  import type { InboxState, MailMessage } from './topic'

  // The desktop email card in the three widget sizes:
  //
  //   small (2x2)   the unread count and who the newest message is from
  //   medium (4x2)  the count in a column, with the newest messages beside it
  //   large (4x4)   a header, then the newest unread messages
  //
  // Only headers are read and nothing is marked read.

  const CALL_TIMEOUT_MS = 40000
  const CLOCK_TICK_MS = 30_000
  const MEDIUM_ROWS = 3
  const LARGE_ROW_HEIGHT_PX = 46
  const LARGE_FURNITURE_PX = 96

  let { bus, args }: ViewProps = $props()

  let current = $state<InboxState | null>(null)
  let now = $state(Date.now())
  let refreshing = $state(false)

  const box = $derived(widgetBoxOf(args))
  const messages = $derived(messagesOf(current))
  const largeRows = $derived(Math.max(3, Math.floor((box.height - LARGE_FURNITURE_PX) / LARGE_ROW_HEIGHT_PX)))
  const rowLimit = $derived(rowLimitOf(box.size, largeRows))
  const shownMessages = $derived(messages.slice(0, rowLimit))
  const hiddenCount = $derived(hiddenCountOf(current, shownMessages))
  const problem = $derived(problemOfState(current))

  $effect(() =>
    subscribeTo(bus, 'email.inbox', (message) => {
      current = inboxStateOf(message.data)
    }),
  )

  // Ages are written relative to now, so the card re-renders on a timer even
  // when nothing new arrives.
  $effect(() => {
    const timer = setInterval(() => {
      now = Date.now()
    }, CLOCK_TICK_MS)
    return () => {
      clearInterval(timer)
    }
  })

  function messagesOf(state: InboxState | null): MailMessage[] {
    if (state === null) {
      return []
    }
    return state.messages
  }

  function rowLimitOf(size: string, large: number): number {
    if (size === 'large') {
      return large
    }
    if (size === 'medium') {
      return MEDIUM_ROWS
    }
    return 0
  }

  // Unread messages the card has no room for, or never fetched the headers of.
  function hiddenCountOf(state: InboxState | null, shown: MailMessage[]): number {
    if (state === null) {
      return 0
    }
    return Math.max(0, state.unread - shown.length)
  }

  function problemOfState(state: InboxState | null): string {
    if (state === null) {
      return ''
    }
    return problemOf(state.accounts)
  }

  function openSettings(): void {
    bus.publish('settings:open', { section: 'email' })
  }

  async function refresh(): Promise<void> {
    refreshing = true
    await bus.call('email:refresh', {}, CALL_TIMEOUT_MS).catch(() => ({}))
    refreshing = false
  }

  function latestSubjectOf(state: InboxState): string {
    const latest = state.messages[0]
    if (latest === undefined) {
      return ''
    }
    return subjectOf(latest)
  }

  function refreshTooltip(busy: boolean): string {
    if (busy) {
      return 'Checking…'
    }
    return 'Check now'
  }

  function refreshClass(busy: boolean): string {
    if (busy) {
      return 'card-gear mail-refreshing'
    }
    return 'card-gear'
  }
</script>

{#snippet notice(icon: string, title: string, hint: string, withLink: boolean)}
  <gtkbox class="container-notice" orientation="vertical" spacing={4} halign="center" valign="center" vexpand>
    <gtkicon {icon} size={26}></gtkicon>
    <gtklabel class="card-title">{title}</gtklabel>
    <gtklabel class="card-hint" wrap justify="center" lines={4} ellipsize="end">{hint}</gtklabel>
    {#if withLink}
      <gtkbutton class="picture-link" frame={false} onclicked={openSettings}>Add an account</gtkbutton>
    {/if}
  </gtkbox>
{/snippet}

{#snippet rows()}
  <gtkbox orientation="vertical" spacing={2} vexpand>
    {#each shownMessages as message (message.id)}
      <MailRow {message} {now} />
    {/each}
    {#if hiddenCount > 0}
      <gtklabel class="card-hint container-more" halign="start">+{hiddenCount} more</gtklabel>
    {/if}
  </gtkbox>
{/snippet}

<gtkbox class="card" orientation="vertical" spacing={10} hexpand vexpand>
  {#if current === null}
    <gtkbox class="container-notice" orientation="vertical" spacing={6} halign="center" valign="center" vexpand>
      <gtkspinner spinning></gtkspinner>
      <gtklabel class="card-hint">Checking your mail…</gtklabel>
    </gtkbox>
  {:else if current.accounts.length === 0}
    {@render notice('mail-unread-symbolic', 'No mail account yet', 'Add an IMAP account to see what is unread.', true)}
  {:else if allFailedOf(current)}
    {@render notice('dialog-warning-symbolic', 'Can’t read your mail', problem, false)}
  {:else if box.size === 'small'}
    <gtkbox class="card-summary" orientation="vertical" spacing={6} vexpand>
      <gtkbox orientation="horizontal" spacing={6}>
        <gtkicon icon="mail-unread-symbolic" size={14} valign="center"></gtkicon>
        <gtklabel class="card-title" halign="start">Email</gtklabel>
      </gtkbox>
      <gtklabel class="card-reading" tabular halign="start" valign="end" vexpand>{current.unread}</gtklabel>
      <gtklabel class="card-body" halign="start">{unreadLabelOf(current.unread)}</gtklabel>
      <gtkbox orientation="vertical" valign="end">
        <gtklabel class="card-body" halign="start" ellipsize="end">{latestLineOf(current)}</gtklabel>
        <gtklabel class="card-hint" halign="start" ellipsize="end">{latestSubjectOf(current)}</gtklabel>
      </gtkbox>
    </gtkbox>
  {:else if box.size === 'medium'}
    <gtkbox orientation="horizontal" spacing={14} vexpand>
      <gtkbox class="card-summary" orientation="vertical" spacing={4} width={118}>
        <gtkbox orientation="horizontal" spacing={6}>
          <gtkicon icon="mail-unread-symbolic" size={14} valign="center"></gtkicon>
          <gtklabel class="card-title" halign="start">Email</gtklabel>
        </gtkbox>
        <gtklabel class="card-reading" tabular halign="start" valign="end" vexpand>{current.unread}</gtklabel>
        <gtklabel class="card-body" halign="start" ellipsize="end">{unreadLabelOf(current.unread)}</gtklabel>
      </gtkbox>
      {#if messages.length === 0}
        {@render notice('object-select-symbolic', 'Inbox zero', 'Nothing unread.', false)}
      {:else}
        <gtkbox orientation="vertical" hexpand valign="center">
          {@render rows()}
        </gtkbox>
      {/if}
    </gtkbox>
  {:else}
    <gtkbox orientation="horizontal" spacing={8}>
      <gtkbox orientation="vertical" hexpand>
        <gtklabel class="card-title" halign="start">Email</gtklabel>
        <gtklabel class="card-hint" halign="start">{current.unread} {unreadLabelOf(current.unread)}</gtklabel>
      </gtkbox>
      <gtkbutton
        class={refreshClass(refreshing)}
        frame={false}
        icon="view-refresh-symbolic"
        tooltip={refreshTooltip(refreshing)}
        valign="start"
        sensitive={!refreshing}
        onclicked={() => void refresh()}
      ></gtkbutton>
    </gtkbox>
    {#if messages.length === 0}
      {@render notice('object-select-symbolic', 'Inbox zero', 'Nothing unread.', false)}
    {:else}
      {@render rows()}
    {/if}
    {#if problem !== ''}
      <gtklabel class="card-hint container-footer-error" halign="start" ellipsize="end" xalign={0}>{problem}</gtklabel>
    {/if}
  {/if}
</gtkbox>
