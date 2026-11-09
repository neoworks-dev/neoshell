<script lang="ts">
  import { Button, IconButton, List, ListRow, SectionHeader, SegmentedButton, Slider, TextField } from '@neoworks/gtk-ui'
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { recordOf, stringOf } from '../../lib/record'
  import { Settings } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import { DEFAULT_POLL_MINUTES, MAX_POLL_MINUTES, MIN_POLL_MINUTES, PLAIN_PORT, TLS_PORT } from './accounts'
  import { inboxStateOf } from './topic'
  import type { AccountStatus, InboxState } from './topic'

  // Settings → Email: the accounts and a form to add one. The backend signs in
  // to a new account before it stores anything, and keeps the password in the
  // keyring, so this page only ever sees names and statuses.

  const ADD_TIMEOUT_MS = 60000
  const REMOVE_TIMEOUT_MS = 10000
  const SECURITY_OPTIONS = [
    { value: 'tls', label: 'Encrypted (TLS)' },
    { value: 'plain', label: 'None (this computer only)' },
  ]
  const HINT =
    'Mail is read over IMAP, which every provider offers. Gmail, iCloud, Fastmail and others need an app password rather than your usual one. The password is kept in the system keyring, not in the config file, and only message headers are read.'

  let { bus }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))

  let inbox = $state<InboxState | null>(null)
  let name = $state('')
  let user = $state('')
  let host = $state('')
  let port = $state('')
  let security = $state('tls')
  let password = $state('')
  let adding = $state(false)
  let addError = $state('')

  const accounts = $derived(accountsOf(inbox))
  const pollMinutes = $derived(settings.number('email.pollMinutes', DEFAULT_POLL_MINUTES))
  const portInvalid = $derived(port.trim() !== '' && !/^\d{1,5}$/.test(port.trim()))
  const canAdd = $derived(!adding && host.trim() !== '' && user.trim() !== '' && password !== '' && !portInvalid)

  $effect(() => settings.connect())

  $effect(() =>
    subscribeTo(bus, 'email.inbox', (message) => {
      inbox = inboxStateOf(message.data)
    }),
  )

  function accountsOf(state: InboxState | null): AccountStatus[] {
    if (state === null) {
      return []
    }
    return state.accounts
  }

  function subtitleOf(account: AccountStatus): string {
    if (account.status === 'ok') {
      return `${account.user} · ${account.unread} unread`
    }
    if (account.status === 'checking') {
      return `${account.user} · checking…`
    }
    return account.message
  }

  function portNumber(): number {
    if (port.trim() === '') {
      return portDefault(security)
    }
    return Number(port.trim())
  }

  function portDefault(chosen: string): number {
    if (chosen === 'plain') {
      return PLAIN_PORT
    }
    return TLS_PORT
  }

  async function add(): Promise<void> {
    adding = true
    addError = ''
    const request = { name, user, host, port: portNumber(), security, password }
    const reply = recordOf(await bus.call('email:add', request, ADD_TIMEOUT_MS).catch(errorReply))
    adding = false
    addError = stringOf(reply.error)
    if (addError === '') {
      name = ''
      user = ''
      host = ''
      port = ''
      password = ''
    }
  }

  function submit(): void {
    if (canAdd) {
      void add()
    }
  }

  function errorReply(error: unknown): Record<string, unknown> {
    return { error: String(error) }
  }

  function addLabel(busy: boolean): string {
    if (busy) {
      return 'Signing in…'
    }
    return 'Add account'
  }

  function remove(account: AccountStatus): void {
    void bus.call('email:remove', { id: account.id }, REMOVE_TIMEOUT_MS)
  }

  function minutesLabel(minutes: number): string {
    return `${minutes} min`
  }
</script>

<gtkbox class="settings-content" orientation="vertical" spacing={8}>
  <SectionHeader title="Accounts" description="Their unread mail shows on the desktop's Email widget." level={3} />
  <List variant="card" dividers>
    {#each accounts as account (account.id)}
      <ListRow title={account.name} subtitle={subtitleOf(account)}>
        {#snippet trailing()}
          <IconButton icon="user-trash-symbolic" label="Remove {account.name}" size="sm" onclick={() => remove(account)} />
        {/snippet}
      </ListRow>
    {:else}
      <ListRow title="No accounts yet" subtitle="Add one below." />
    {/each}
    <ListRow title="Check every" subtitle="How often the mailboxes are asked">
      {#snippet trailing()}
        <Slider
          value={pollMinutes}
          min={MIN_POLL_MINUTES}
          max={MAX_POLL_MINUTES}
          step={1}
          showValue
          formatValue={minutesLabel}
          oninput={(minutes) => settings.set('email.pollMinutes', minutes)}
        />
      {/snippet}
    </ListRow>
  </List>

  <SectionHeader title="Add an account" description="Any IMAP mailbox works." level={3} />
  <gtklabel class="settings-hint" halign="fill" xalign={0} wrap>{HINT}</gtklabel>
  <gtkbox orientation="vertical" spacing={12}>
    <TextField label="Name" placeholder="Work" bind:value={name} disabled={adding} />
    <TextField label="User name" placeholder="me@example.com" bind:value={user} disabled={adding} />
    <TextField label="IMAP server" placeholder="imap.example.com" bind:value={host} disabled={adding} />
    <gtkbox orientation="horizontal" spacing={12}>
      <gtkbox hexpand>
        <TextField
          label="Port"
          placeholder={String(portDefault(security))}
          bind:value={port}
          error={portInvalid}
          disabled={adding}
        />
      </gtkbox>
      <gtkbox orientation="vertical" spacing={4} valign="end">
        <SegmentedButton label="Connection security" options={SECURITY_OPTIONS} bind:value={security} />
      </gtkbox>
    </gtkbox>
    <TextField
      label="Password"
      type="password"
      placeholder="app password"
      bind:value={password}
      error={addError !== ''}
      supportingText={addError}
      disabled={adding}
      onsubmit={submit}
    />
    <gtkbox halign="end">
      <Button variant="primary" label={addLabel(adding)} disabled={!canAdd} onclick={() => void add()} />
    </gtkbox>
  </gtkbox>
</gtkbox>
