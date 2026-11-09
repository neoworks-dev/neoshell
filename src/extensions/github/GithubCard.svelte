<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { BusService } from '../../lib/bus'

  // The frame every GitHub card shares: the header with its refresh button,
  // and in place of the content a loading, missing-gh, signed-out or error
  // notice whenever the data is not there.

  const REFRESH_TIMEOUT_MS = 5000
  const REFRESH_QUIET_MS = 1500
  const NOTICE_ICON_PX = 32

  let {
    bus,
    title,
    icon,
    status,
    message = '',
    compact = false,
    trailing,
    children,
  }: {
    bus: BusService
    title: string
    icon: string
    // The backend's status, or "loading" before the first message.
    status: string
    message?: string
    // The small card's header drops the icon to give the title its room.
    compact?: boolean
    trailing?: Snippet
    children: Snippet
  } = $props()

  let refreshing = $state(false)

  const notice = $derived(noticeOf(status, message))

  function refresh(): void {
    refreshing = true
    void bus.call('github:refresh', {}, REFRESH_TIMEOUT_MS).catch(() => undefined)
    setTimeout(() => {
      refreshing = false
    }, REFRESH_QUIET_MS)
  }

  function noticeOf(state: string, detail: string): { icon: string; title: string; hint: string } {
    if (state === 'missing') {
      return {
        icon: 'dialog-warning-symbolic',
        title: 'GitHub CLI not found',
        hint: 'Install gh to see your GitHub activity here.',
      }
    }
    if (state === 'unauthenticated') {
      return {
        icon: 'dialog-password-symbolic',
        title: 'Not signed in to GitHub',
        hint: 'Run gh auth login in a terminal.',
      }
    }
    return { icon: 'dialog-error-symbolic', title: 'Could not reach GitHub', hint: detail }
  }
</script>

<gtkbox class="card gh-card" orientation="vertical" spacing={8} hexpand vexpand>
  <gtkbox class="gh-header" orientation="horizontal" spacing={6}>
    {#if !compact}
      <gtkicon class="gh-header-icon" {icon} size={14} valign="center"></gtkicon>
    {/if}
    <gtklabel class="card-title" halign="start" ellipsize="end">{title}</gtklabel>
    <gtkbox hexpand></gtkbox>
    {#if trailing !== undefined && status === 'ok'}
      {@render trailing()}
    {/if}
    <gtkbutton
      class="card-gear"
      frame={false}
      icon="view-refresh-symbolic"
      tooltip="Refresh"
      sensitive={!refreshing}
      onclicked={refresh}
    ></gtkbutton>
  </gtkbox>

  {#if status === 'ok'}
    {@render children()}
  {:else if status === 'loading'}
    <gtkbox class="gh-notice" orientation="vertical" spacing={8} valign="center" halign="center" vexpand>
      <gtkspinner spinning halign="center" width={NOTICE_ICON_PX} height={NOTICE_ICON_PX}></gtkspinner>
      <gtklabel class="card-hint" halign="center">Loading…</gtklabel>
    </gtkbox>
  {:else}
    <gtkbox class="gh-notice" orientation="vertical" spacing={6} valign="center" halign="center" vexpand>
      <gtkicon class="gh-notice-icon" icon={notice.icon} size={NOTICE_ICON_PX} halign="center"></gtkicon>
      <gtklabel class="card-title" halign="center" wrap justify="center">{notice.title}</gtklabel>
      <gtklabel class="card-hint" halign="center" wrap justify="center" lines={3} ellipsize="end">
        {notice.hint}
      </gtklabel>
    </gtkbox>
  {/if}
</gtkbox>
