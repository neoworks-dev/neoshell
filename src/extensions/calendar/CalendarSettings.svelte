<script lang="ts">
  import { Button, Card, IconButton, ListRow, SectionHeader, TextField } from '@neoworks/gtk-ui'
  import { subscribeTo } from '../../lib/bus'
  import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record'
  import type { ViewProps } from '../../host/plugins/views'
  import type { SourceStatus } from './backend'

  // Settings → Calendar: the subscribed feeds and a form to add one. The
  // backend checks and stores a new feed (its address goes to the keyring),
  // so this page only ever sees names and statuses.

  const ADD_TIMEOUT_MS = 30000
  const REMOVE_TIMEOUT_MS = 10000
  const GOOGLE_HINT =
    'In Google Calendar it is under the calendar’s settings → Integrate calendar → Secret address in iCal format. ' +
    'The address is kept in the system keyring, not in the config file.'

  let { bus }: ViewProps = $props()

  let sources = $state<SourceStatus[]>([])
  let name = $state('')
  let url = $state('')
  let adding = $state(false)
  let addError = $state('')

  $effect(() =>
    subscribeTo(bus, 'calendar.sources', (message) => {
      sources = arrayOf(recordOf(message.data).sources).map(statusOf)
    }),
  )

  function statusOf(record: Record<string, unknown>): SourceStatus {
    return {
      id: stringOf(record.id),
      name: stringOf(record.name),
      status: stringOf(record.status),
      message: stringOf(record.message),
      eventCount: numberOf(record.eventCount, 0),
    }
  }

  function subtitleOf(source: SourceStatus): string {
    if (source.status === 'ok') {
      return `${source.eventCount} events in the next two months`
    }
    return source.message
  }

  async function add(): Promise<void> {
    adding = true
    addError = ''
    const reply = recordOf(await bus.call('calendar:add', { name, url }, ADD_TIMEOUT_MS).catch(errorReply))
    adding = false
    addError = stringOf(reply.error)
    if (addError === '') {
      name = ''
      url = ''
    }
  }

  function errorReply(error: unknown): Record<string, unknown> {
    return { error: String(error) }
  }

  function addLabel(busy: boolean): string {
    if (busy) {
      return 'Checking…'
    }
    return 'Add calendar'
  }

  function remove(source: SourceStatus): void {
    void bus.call('calendar:remove', { id: source.id }, REMOVE_TIMEOUT_MS)
  }
</script>

<gtkbox class="settings-content" orientation="vertical" spacing={20}>
  <SectionHeader title="Calendars" description="Events show in the notch's calendar." level={4} />
  <Card padding="none">
    {#each sources as source (source.id)}
      <ListRow title={source.name} subtitle={subtitleOf(source)}>
        {#snippet trailing()}
          <IconButton icon="user-trash-symbolic" label="Remove {source.name}" size="sm" onclick={() => remove(source)} />
        {/snippet}
      </ListRow>
    {:else}
      <ListRow title="No calendars yet" subtitle="Add one below." />
    {/each}
  </Card>

  <SectionHeader title="Add a calendar" description="Any iCal (.ics) address works." level={4} />
  <gtklabel class="settings-hint" halign="fill" xalign={0} wrap>{GOOGLE_HINT}</gtklabel>
  <gtkbox orientation="vertical" spacing={12}>
    <TextField label="Name" placeholder="Work" bind:value={name} disabled={adding} />
    <TextField
      label="iCal address"
      type="password"
      placeholder="https://… or webcal://…"
      bind:value={url}
      error={addError !== ''}
      supportingText={addError}
      disabled={adding}
      onsubmit={() => void add()}
    />
    <gtkbox halign="end">
      <Button
        variant="primary"
        label={addLabel(adding)}
        disabled={adding || url.trim() === ''}
        onclick={() => void add()}
      />
    </gtkbox>
  </gtkbox>
</gtkbox>
