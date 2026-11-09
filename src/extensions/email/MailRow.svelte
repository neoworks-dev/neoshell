<script lang="ts">
  import { avatarToneOf, initialOf, relativeTimeOf, senderOf, subjectOf } from './display'
  import type { MailMessage } from './topic'

  // One unread message: the sender's avatar, who it is from, the subject and
  // how long ago. It slides open when it first appears, which is how a message
  // that arrives shows up in the list.

  const SLIDE_MS = 260
  const SLIDE_DELAY_MS = 30
  const AVATAR_PX = 30

  let { message, now }: { message: MailMessage; now: number } = $props()

  let shown = $state(false)

  const avatarClass = $derived(`mail-avatar avatar-${avatarToneOf(message.address)}`)
  const tooltip = $derived(`${senderOf(message)} <${message.address}>\n${subjectOf(message)}\n${message.accountName}`)

  $effect(() => {
    const timer = setTimeout(() => {
      shown = true
    }, SLIDE_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  })
</script>

<gtkrevealer reveal={shown} transition="slide-down" duration={SLIDE_MS}>
  <gtkbox class="mail-row" orientation="horizontal" spacing={10} {tooltip}>
    <gtkbox class={avatarClass} width={AVATAR_PX} height={AVATAR_PX} halign="start" valign="center">
      <gtklabel class="mail-initial" halign="center" valign="center" width={AVATAR_PX}>{initialOf(message)}</gtklabel>
    </gtkbox>
    <gtkbox orientation="vertical" hexpand valign="center">
      <gtkbox orientation="horizontal" spacing={8}>
        <gtklabel class="container-name" hexpand halign="start" ellipsize="end" xalign={0}>
          {senderOf(message)}
        </gtklabel>
        <gtklabel class="card-range" tabular halign="end">{relativeTimeOf(message.time, now)}</gtklabel>
      </gtkbox>
      <gtklabel class="card-range" halign="start" ellipsize="end" xalign={0}>{subjectOf(message)}</gtklabel>
    </gtkbox>
  </gtkbox>
</gtkrevealer>
