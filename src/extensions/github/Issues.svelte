<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { widgetBoxOf } from '../../lib/widget'
  import GithubCard from './GithubCard.svelte'
  import IssueRow from './IssueRow.svelte'
  import Link from './Link.svelte'
  import NotificationRow from './NotificationRow.svelte'
  import Reveal from './Reveal.svelte'
  import TickingNumber from './TickingNumber.svelte'
  import { Clock } from './clock.svelte'
  import { issuesOf, pluralize } from './lib'
  import type { IssuesState } from './model'
  import { settingsOf } from './settings'

  // The issues-and-notifications card in the three widget sizes:
  //
  //   small (2x2)   how many are open, split into issues and pull requests, and
  //                 how many notifications are unread
  //   medium (4x2)  the most recently active items, the unread count in the header
  //   large (4x4)   the items and the notifications, one under the other
  //
  // The sections shown follow the config (github.assigned, github.authored,
  // github.notifications …), which the backend fetches by as well.

  const MEDIUM_ROWS = 3
  const LARGE_ROWS = 5
  const LARGE_NOTIFICATION_ROWS = 2
  const LARGE_ROWS_WITHOUT_NOTIFICATIONS = 8
  const ROW_STAGGER_MS = 60

  let { bus, args }: ViewProps = $props()

  let issues = $state<IssuesState | null>(null)
  let showNotifications = $state(true)
  const clock = new Clock()

  const box = $derived(widgetBoxOf(args))
  const status = $derived(statusOf(issues))
  const message = $derived(messageOf(issues))
  const items = $derived(itemsOf(issues))
  const pullRequests = $derived(items.filter((item) => item.isPullRequest).length)
  const unread = $derived(unreadOf(issues))
  const largeRows = $derived(largeRowsOf(showNotifications))
  const moreSuffix = $derived(moreSuffixOf(issues))

  $effect(() => clock.connect())
  $effect(() =>
    subscribeTo(bus, 'github.issues', (incoming) => {
      issues = issuesOf(incoming.data)
    }),
  )
  $effect(() =>
    subscribeTo(bus, 'config', (incoming) => {
      showNotifications = settingsOf(incoming.data).showNotifications
    }),
  )

  function statusOf(state: IssuesState | null): string {
    if (state === null) {
      return 'loading'
    }
    return state.status
  }

  function messageOf(state: IssuesState | null): string {
    if (state === null) {
      return ''
    }
    return state.message
  }

  function itemsOf(state: IssuesState | null): IssuesState['items'] {
    if (state === null) {
      return []
    }
    return state.items
  }

  function unreadOf(state: IssuesState | null): number {
    if (state === null) {
      return 0
    }
    return state.unreadCount
  }

  function largeRowsOf(withNotifications: boolean): number {
    if (withNotifications) {
      return LARGE_ROWS
    }
    return LARGE_ROWS_WITHOUT_NOTIFICATIONS
  }

  function moreSuffixOf(state: IssuesState | null): string {
    if (state !== null && state.truncated) {
      return '+'
    }
    return ''
  }

  function dotClass(count: number): string {
    if (count > 0) {
      return 'gh-unread-dot gh-unread'
    }
    return 'gh-unread-dot'
  }

  function emptyNotificationsText(state: IssuesState): string {
    if (state.notificationsMessage !== '') {
      return state.notificationsMessage
    }
    return 'No notifications.'
  }

  function unreadLabel(count: number): string {
    if (count === 0) {
      return 'All caught up'
    }
    return `${count} unread`
  }
</script>

{#snippet unreadBadge()}
  {#if showNotifications}
    <gtkbox class="gh-badge" orientation="horizontal" spacing={5} valign="center" halign="start">
      <gtkbox class={dotClass(unread)} width={7} height={7} valign="center"></gtkbox>
      <gtklabel class="gh-badge-label" tabular>{unreadLabel(unread)}</gtklabel>
    </gtkbox>
  {/if}
{/snippet}

{#snippet headerBadge()}
  {#if box.size !== 'small'}
    {@render unreadBadge()}
  {/if}
{/snippet}

{#snippet empty()}
  <gtkbox orientation="vertical" spacing={4} valign="center" halign="center" vexpand>
    <gtkicon class="gh-notice-icon" icon="emblem-ok-symbolic" size={28} halign="center"></gtkicon>
    <gtklabel class="card-title" halign="center">Nothing open</gtklabel>
    <gtklabel class="card-hint" halign="center">No issues or pull requests need you.</gtklabel>
  </gtkbox>
{/snippet}

<GithubCard
  {bus}
  title="Issues & PRs"
  icon="dialog-information-symbolic"
  {status}
  {message}
  compact={box.size === 'small'}
  trailing={headerBadge}
>
  {#if issues !== null}
    {#if box.size === 'small'}
      <gtkbox orientation="vertical" vexpand>
        <Link {bus} url={issues.searchUrl} row>
          <TickingNumber class="gh-total" value={items.length} suffix={moreSuffix} />
          <gtklabel class="card-hint" halign="start">open issues and PRs</gtklabel>
          <gtklabel class="gh-streak" halign="start" margin-top={6}>
            {pluralize(items.length - pullRequests, 'issue')} · {pluralize(pullRequests, 'PR')}
          </gtklabel>
        </Link>
        <gtkbox vexpand></gtkbox>
        {@render unreadBadge()}
      </gtkbox>
    {:else if box.size === 'medium'}
      {#if items.length === 0}
        {@render empty()}
      {:else}
        <gtkbox orientation="vertical" spacing={2} valign="start">
          {#each items.slice(0, MEDIUM_ROWS) as item, index (item.url)}
            <Reveal delay={index * ROW_STAGGER_MS}>
              <IssueRow {bus} issue={item} now={clock.now} />
            </Reveal>
          {/each}
        </gtkbox>
      {/if}
    {:else}
      <gtklabel class="gh-section" halign="start">
        {pluralize(items.length, 'open item')}
      </gtklabel>
      <gtkbox orientation="vertical" spacing={2} vexpand={!showNotifications}>
        {#each items.slice(0, largeRows) as item, index (item.url)}
          <Reveal delay={index * ROW_STAGGER_MS}>
            <IssueRow {bus} issue={item} now={clock.now} />
          </Reveal>
        {:else}
          <gtklabel class="card-hint" halign="start">Nothing open.</gtklabel>
        {/each}
      </gtkbox>
      {#if showNotifications}
        <gtkbox vexpand></gtkbox>
        <gtklabel class="gh-section" halign="start">
          {unreadLabel(unread)} · notifications
        </gtklabel>
        <gtkbox orientation="vertical" spacing={2}>
          {#each issues.notifications.slice(0, LARGE_NOTIFICATION_ROWS) as notification, index (notification.id)}
            <Reveal delay={(index + LARGE_ROWS) * ROW_STAGGER_MS}>
              <NotificationRow {bus} {notification} now={clock.now} />
            </Reveal>
          {:else}
            <gtklabel class="card-hint" halign="start">
              {emptyNotificationsText(issues)}
            </gtklabel>
          {/each}
        </gtkbox>
      {/if}
    {/if}
  {/if}
</GithubCard>
