<script lang="ts">
  import { reasonLabelOf, relativeTime } from './lib'
  import type { NotificationEntry } from './model'

  // An unread (or recently read) notification: a dot while it is unread, the
  // title, and its repository, reason and age.

  let { notification, now }: { notification: NotificationEntry; now: number } = $props()

  const meta = $derived(
    `${notification.repo} · ${reasonLabelOf(notification.reason)} · ${relativeTime(notification.updatedAt, now)}`,
  )

  function dotClass(entry: NotificationEntry): string {
    if (entry.unread) {
      return 'gh-unread-dot gh-unread'
    }
    return 'gh-unread-dot'
  }
</script>

<gtkbox class="gh-row" orientation="horizontal" spacing={8} tooltip={notification.title}>
  <gtkbox class={dotClass(notification)} width={7} height={7} valign="center"></gtkbox>
  <gtkbox orientation="vertical" hexpand halign="fill">
    <gtklabel class="gh-row-title" halign="start" xalign={0} ellipsize="end">{notification.title}</gtklabel>
    <gtklabel class="card-hint" halign="start" xalign={0} ellipsize="end">{meta}</gtklabel>
  </gtkbox>
</gtkbox>
