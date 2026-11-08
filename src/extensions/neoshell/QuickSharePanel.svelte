<script lang="ts">
  import type { BusService } from '../../lib/bus'
  import { subscribeTo } from '../../lib/bus'
  import { recordOf } from '../../lib/record'
  import { Settings } from '../../lib/settings.svelte'
  import { untrack } from 'svelte'
  import type { Device, QuickShareState, Transfer } from '../quickshare/state'
  import { ENDED_STATES, initialState } from '../quickshare/state'
  import { downloadDropped } from './trayDownloads'

  // The Tray's Quick Share container, left of the shelf. Files dropped here
  // (from anywhere, or a Tray tile) wait while nearby devices are discovered,
  // and go to the one picked. An incoming share asks here, with its PIN, and
  // a running transfer shows its progress. Receiving is off until switched on.

  const CALL_TIMEOUT_MS = 5000
  const CONSENT_STATE = 'waitingForUserConsent'

  let {
    bus,
    height,
    ondragenter,
    onhold,
  }: {
    bus: BusService
    height: number
    // A drag reached the panel: the notch must stay open.
    ondragenter: () => void
    // Whether the panel waits on the user: files to send, or a share to answer.
    onhold: (hold: boolean) => void
  } = $props()

  const settings = new Settings(untrack(() => bus))

  let state = $state.raw<QuickShareState>(initialState())
  let pending = $state<string[]>([])
  let dragOver = $state(false)

  const request = $derived(state.transfers.find(isConsentRequest))
  const current = $derived(lastOf(state.transfers))
  const receiving = $derived(settings.string('quickshare.visibility', 'invisible') === 'visible')

  const waiting = $derived(pending.length > 0 || request !== undefined)

  $effect(() => settings.connect())

  $effect(() => {
    onhold(waiting)
  })

  // Leaving the Tray tab drops a half-made send; the notch need not wait for
  // a panel that is gone.
  $effect(() => () => {
    if (pending.length > 0) {
      call('quickshare:discover', { on: false })
    }
    onhold(false)
  })

  $effect(() =>
    subscribeTo(bus, 'quickshare.state', (message) => {
      state = recordOf(message.data) as unknown as QuickShareState
    }),
  )

  function isConsentRequest(transfer: Transfer): boolean {
    return transfer.direction === 'incoming' && transfer.state === CONSENT_STATE
  }

  function lastOf(transfers: Transfer[]): Transfer | undefined {
    return transfers[transfers.length - 1]
  }

  function call(type: string, data: Record<string, unknown>): void {
    bus.call(type, data, CALL_TIMEOUT_MS).catch((error: unknown) => {
      console.error(`quickshare: ${type} failed:`, error)
    })
  }

  function dragEntered(): void {
    dragOver = true
    ondragenter()
  }

  async function dropped(detail: { paths: string[]; uris: string[]; image: string }): Promise<void> {
    dragOver = false
    const files = [...detail.paths, ...(await downloadDropped(detail.uris, detail.image))]
    if (files.length === 0 || !state.available) {
      return
    }
    pending = files
    call('quickshare:discover', { on: true })
  }

  function sendTo(device: Device): void {
    call('quickshare:send', { device: device.id, files: pending })
    stopPicking()
  }

  function stopPicking(): void {
    pending = []
    call('quickshare:discover', { on: false })
  }

  function setReceiving(on: boolean): void {
    if (on) {
      settings.set('quickshare.visibility', 'visible')
      return
    }
    settings.set('quickshare.visibility', 'invisible')
  }

  function receivingLabel(isReceiving: boolean): string {
    if (isReceiving) {
      return 'Receiving: on'
    }
    return 'Receiving: off'
  }

  function panelClass(isTarget: boolean): string {
    if (isTarget) {
      return 'quickshare-panel quickshare-panel-target'
    }
    return 'quickshare-panel'
  }

  function fileCount(count: number): string {
    if (count === 1) {
      return '1 file'
    }
    return `${count} files`
  }

  function incomingSummary(transfer: Transfer): string {
    if (transfer.text !== '') {
      return 'wants to share text'
    }
    return `wants to send ${fileCount(transfer.files.length)}`
  }

  function progressOf(transfer: Transfer): number {
    if (transfer.bytesTotal <= 0) {
      return 0
    }
    return transfer.bytesDone / transfer.bytesTotal
  }

  function endedLabel(transfer: Transfer): string {
    if (transfer.state !== 'finished') {
      return `Transfer ${transfer.state}`
    }
    if (transfer.direction === 'incoming') {
      return `Received from ${transfer.peer}`
    }
    return `Sent to ${transfer.peer}`
  }
</script>

<gtkbox
  class={panelClass(dragOver)}
  orientation="vertical"
  spacing={6}
  hexpand
  css="min-height: {height}px;"
  ondropenter={dragEntered}
  ondropleave={() => (dragOver = false)}
  ondrop={(event) => void dropped(event.detail)}
>
  {#if !state.available}
    {@render idle(state.reason)}
  {:else if request !== undefined}
    {@render consent(request)}
  {:else if pending.length > 0}
    {@render picker()}
  {:else if current !== undefined && !ENDED_STATES.has(current.state)}
    {@render progress(current)}
  {:else if current !== undefined}
    {@render ended(current)}
  {:else}
    {@render idle('Drop files to send')}
  {/if}
</gtkbox>

{#snippet idle(hint: string)}
  <gtkbox orientation="vertical" spacing={2} vexpand valign="center">
    <gtkicon icon="send-to-symbolic" size={18}></gtkicon>
    <gtklabel class="quickshare-title">Quick Share</gtklabel>
    <gtklabel class="quickshare-hint" wrap justify="center" max-width-chars={18}>{hint}</gtklabel>
  </gtkbox>
  {#if state.available}
    <gtkbutton class="quickshare-receive" frame={false} halign="center" onclicked={() => setReceiving(!receiving)}>
      <gtklabel>{receivingLabel(receiving)}</gtklabel>
    </gtkbutton>
  {/if}
{/snippet}

{#snippet picker()}
  <gtkbox orientation="horizontal" spacing={6}>
    <gtklabel class="quickshare-title" hexpand halign="start" ellipsize="end">Send {fileCount(pending.length)}</gtklabel>
    <gtkbutton class="quickshare-close" frame={false} tooltip="Cancel" onclicked={stopPicking}>
      <gtkicon icon="window-close-symbolic" size={12}></gtkicon>
    </gtkbutton>
  </gtkbox>
  <gtkscrolledwindow hscroll="never" vexpand>
    <gtkbox orientation="vertical" spacing={2}>
      {#each state.devices as device (device.id)}
        <gtkbutton class="quickshare-device" frame={false} onclicked={() => sendTo(device)}>
          <gtklabel halign="start" ellipsize="end">{device.name}</gtklabel>
        </gtkbutton>
      {:else}
        <gtkbox orientation="vertical" spacing={6} halign="center" vexpand valign="center">
          <gtkspinner spinning></gtkspinner>
          <gtklabel class="quickshare-hint" wrap justify="center" max-width-chars={14}>Looking for devices…</gtklabel>
        </gtkbox>
      {/each}
    </gtkbox>
  </gtkscrolledwindow>
{/snippet}

{#snippet consent(transfer: Transfer)}
  <gtklabel class="quickshare-title" ellipsize="end">{transfer.peer}</gtklabel>
  <gtklabel class="quickshare-hint" wrap max-width-chars={14}>{incomingSummary(transfer)}</gtklabel>
  {#if transfer.pin !== ''}
    <gtklabel class="quickshare-pin" tabular>PIN {transfer.pin}</gtklabel>
  {/if}
  <gtkbox orientation="horizontal" spacing={6} homogeneous vexpand valign="end">
    <gtkbutton class="quickshare-action" frame={false} onclicked={() => call('quickshare:reject', { id: transfer.id })}>
      Decline
    </gtkbutton>
    <gtkbutton
      class="quickshare-action quickshare-accept"
      frame={false}
      onclicked={() => call('quickshare:accept', { id: transfer.id })}
    >
      Accept
    </gtkbutton>
  </gtkbox>
{/snippet}

{#snippet progress(transfer: Transfer)}
  <gtklabel class="quickshare-title" ellipsize="end">{transfer.peer}</gtklabel>
  <gtklabel class="quickshare-hint">{fileCount(transfer.files.length)}</gtklabel>
  <gtkprogressbar class="quickshare-progress" value={progressOf(transfer)} vexpand valign="center"></gtkprogressbar>
  <gtkbutton class="quickshare-action" frame={false} onclicked={() => call('quickshare:cancel', { id: transfer.id })}>
    Cancel
  </gtkbutton>
{/snippet}

{#snippet ended(transfer: Transfer)}
  <gtkbox orientation="vertical" spacing={4} vexpand valign="center">
    <gtkicon icon="emblem-ok-symbolic" size={22}></gtkicon>
    <gtklabel class="quickshare-hint" wrap justify="center" max-width-chars={18}>{endedLabel(transfer)}</gtklabel>
  </gtkbox>
{/snippet}
