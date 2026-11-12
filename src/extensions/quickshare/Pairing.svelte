<script lang="ts">
  import { Button, IconCircle } from '@neoworks/gtk-ui'
  import { untrack } from 'svelte'
  import type { BusService } from '../../lib/bus'
  import type { QuickShareState, Transfer } from './state'
  import { ENDED_STATES } from './state'
  import { bytesText, deviceIconOf, deviceKindOf, fileIconOf, pinDigitsOf, shareIconOf, shareTitleOf } from './present'
  import ReceivedPicture from './ReceivedPicture.svelte'

  // Settings → Quick Share → Pair a device. Quick Share has no pairing of its
  // own that rqs_lib can take part in, so a device pairs by sharing to this
  // one: while this screen is up the desktop stays visible (quickshare:pairing),
  // the first share that arrives is shown with its PIN and what it carries,
  // and "Accept & pair" both takes it and trusts the sender's name from then
  // on. The screen follows that one share through to its end.

  const CALL_TIMEOUT_MS = 5000
  const CONSENT_STATE = 'waitingForUserConsent'
  const RADAR_SIZE = 220
  const RINGS = [0, 1, 2]
  const PREVIEW_SIZE = 72
  const MAX_PREVIEWS = 6

  let {
    bus,
    shareState,
    deviceName,
    trusted,
    ontrust,
    onclose,
  }: {
    bus: BusService
    shareState: QuickShareState
    // What phones see this desktop as; '' is the computer's own name.
    deviceName: string
    trusted: string[]
    ontrust: (name: string) => void
    onclose: () => void
  } = $props()

  // The share this screen follows, kept after the backend lets go of it.
  let followed = $state.raw<Transfer | null>(null)
  let pairedNow = $state(false)
  // Shares already answered here: a declined one must not be picked up again
  // while the backend still lists it.
  let dismissed = $state.raw<string[]>([])

  const phase = $derived(phaseOf(followed))
  const peerTrusted = $derived(followed !== null && (pairedNow || trusted.includes(followed.peer)))

  $effect(() => {
    void call('quickshare:pairing', { on: true })
    return () => {
      void call('quickshare:pairing', { on: false })
    }
  })

  $effect(() => {
    const transfers = shareState.transfers
    untrack(() => follow(transfers))
  })

  function follow(transfers: Transfer[]): void {
    if (followed !== null) {
      const live = transfers.find((transfer) => transfer.id === followed?.id)
      if (live !== undefined) {
        followed = live
      }
      return
    }
    const arriving = transfers.find((transfer) => isNewIncoming(transfer))
    if (arriving !== undefined) {
      followed = arriving
    }
  }

  function isNewIncoming(transfer: Transfer): boolean {
    return transfer.direction === 'incoming' && !ENDED_STATES.has(transfer.state) && !dismissed.includes(transfer.id)
  }

  function phaseOf(transfer: Transfer | null): string {
    if (transfer === null) {
      return 'waiting'
    }
    if (transfer.state === CONSENT_STATE) {
      return 'request'
    }
    if (transfer.state === 'finished') {
      return 'done'
    }
    if (ENDED_STATES.has(transfer.state)) {
      return 'failed'
    }
    return 'receiving'
  }

  async function call(type: string, data: Record<string, unknown>): Promise<void> {
    try {
      await bus.call(type, data, CALL_TIMEOUT_MS)
    } catch (error) {
      console.error(`quickshare: ${type} failed:`, error)
    }
  }

  function acceptAndPair(): void {
    if (followed === null) {
      return
    }
    pairedNow = true
    ontrust(followed.peer)
    void call('quickshare:accept', { id: followed.id })
  }

  function acceptOnce(): void {
    if (followed === null) {
      return
    }
    void call('quickshare:accept', { id: followed.id })
  }

  function decline(): void {
    if (followed === null) {
      return
    }
    void call('quickshare:reject', { id: followed.id })
    waitAgain()
  }

  function waitAgain(): void {
    if (followed !== null) {
      dismissed = [...dismissed, followed.id]
    }
    followed = null
    pairedNow = false
  }

  function shownName(name: string): string {
    if (name === '') {
      return 'this computer'
    }
    return name
  }

  function progressOf(transfer: Transfer): number {
    if (transfer.bytesTotal <= 0) {
      return 0
    }
    return Math.min(1, transfer.bytesDone / transfer.bytesTotal)
  }

  function failureOf(transfer: Transfer): string {
    if (transfer.state === 'rejected') {
      return 'The share was declined.'
    }
    if (transfer.state === 'cancelled') {
      return 'The share was cancelled.'
    }
    return 'The connection to the device was lost.'
  }
</script>

<gtkbox class="settings-content qs-pairing" orientation="vertical" spacing={16}>
  <gtkbox orientation="horizontal" spacing={8}>
    <Button variant="ghost" size="sm" icon="go-previous-symbolic" label="Quick Share" onclick={onclose} />
  </gtkbox>

  {#if phase === 'waiting'}
    {@render waiting()}
  {:else if phase === 'request' && followed !== null}
    {@render request(followed)}
  {:else if phase === 'receiving' && followed !== null}
    {@render receiving(followed)}
  {:else if phase === 'done' && followed !== null}
    {@render done(followed)}
  {:else if followed !== null}
    {@render failed(followed)}
  {/if}
</gtkbox>

{#snippet waiting()}
  <gtkbox class="qs-stage" orientation="vertical" spacing={18} halign="center">
    <gtkoverlay class="qs-radar" halign="center">
      <gtkbox width={RADAR_SIZE} height={RADAR_SIZE}></gtkbox>
      {#each RINGS as ring (ring)}
        <gtkbox
          overlay
          class="qs-radar-ring qs-radar-ring-{ring}"
          halign="center"
          valign="center"
          width={RADAR_SIZE}
          height={RADAR_SIZE}
        ></gtkbox>
      {/each}
      <gtkbox overlay class="qs-radar-core" halign="center" valign="center">
        <gtkicon icon="computer-symbolic" size={36}></gtkicon>
      </gtkbox>
    </gtkoverlay>

    <gtkbox orientation="vertical" spacing={4} halign="center">
      <gtklabel class="qs-stage-title">Waiting for a device</gtklabel>
      <gtklabel class="qs-stage-subtitle">
        Visible as “{shownName(deviceName)}” while this screen is open
      </gtklabel>
    </gtkbox>

    <gtkbox class="qs-steps" orientation="vertical" spacing={10} halign="center">
      {@render step(1, 'On your phone, open a photo or file and tap Share.')}
      {@render step(2, 'Choose Quick Share.')}
      {@render step(3, `Pick “${shownName(deviceName)}” from the devices nearby.`)}
    </gtkbox>
  </gtkbox>
{/snippet}

{#snippet step(number: number, text: string)}
  <gtkbox orientation="horizontal" spacing={12}>
    <gtklabel class="qs-step-number" valign="start">{number}</gtklabel>
    <gtklabel class="qs-step-text" wrap xalign={0} valign="center">{text}</gtklabel>
  </gtkbox>
{/snippet}

{#snippet request(transfer: Transfer)}
  <gtkbox class="qs-stage qs-arrive" orientation="vertical" spacing={18} halign="center">
    <gtkbox orientation="vertical" spacing={10} halign="center">
      <gtkbox halign="center">
        <IconCircle icon={deviceIconOf(transfer.peerType)} tone="blue" size="lg" />
      </gtkbox>
      <gtklabel class="qs-stage-title">{transfer.peer}</gtklabel>
      <gtklabel class="qs-stage-subtitle">{deviceKindOf(transfer.peerType)} wants to share {shareTitleOf(transfer)}</gtklabel>
    </gtkbox>

    {#if transfer.pin !== ''}
      <gtkbox orientation="vertical" spacing={8} halign="center">
        <gtkbox class="qs-pin" orientation="horizontal" spacing={8} halign="center">
          {#each pinDigitsOf(transfer.pin) as digit, index (index)}
            <gtklabel class="qs-pin-digit">{digit}</gtklabel>
          {/each}
        </gtkbox>
        <gtklabel class="qs-stage-hint">Check that your phone shows the same code.</gtklabel>
      </gtkbox>
    {/if}

    {@render incomingPreview(transfer)}

    <gtkbox orientation="horizontal" spacing={8} halign="center">
      <Button variant="ghost" label="Decline" onclick={decline} />
      <Button variant="secondary" label="Accept once" onclick={acceptOnce} />
      <Button variant="primary" icon="object-select-symbolic" label="Accept & pair" onclick={acceptAndPair} />
    </gtkbox>
  </gtkbox>
{/snippet}

<!-- Before it is accepted a share is only names (or its text): each file as a
     chip with its type's icon. -->
{#snippet incomingPreview(transfer: Transfer)}
  {#if transfer.textKind !== ''}
    <gtkbox class="qs-text-preview" halign="center">
      <gtkimage icon={shareIconOf(transfer)}></gtkimage>
      <gtklabel wrap lines={3} ellipsize="end" xalign={0}>{transfer.text}</gtklabel>
    </gtkbox>
  {:else}
    <gtkflowbox class="qs-file-chips" halign="center" max-per-line={3} selection="none" spacing={6}>
      {#each transfer.files.slice(0, MAX_PREVIEWS) as file (file)}
        <gtkbox class="qs-file-chip" orientation="horizontal" spacing={6}>
          <gtkimage icon={fileIconOf(file)}></gtkimage>
          <gtklabel ellipsize="middle" max-width-chars={22}>{file}</gtklabel>
        </gtkbox>
      {/each}
    </gtkflowbox>
    {#if transfer.files.length > MAX_PREVIEWS}
      <gtklabel class="qs-stage-hint">and {transfer.files.length - MAX_PREVIEWS} more</gtklabel>
    {/if}
  {/if}
{/snippet}

{#snippet receiving(transfer: Transfer)}
  <gtkbox class="qs-stage" orientation="vertical" spacing={16} halign="center">
    <gtkbox halign="center">
      <IconCircle icon={deviceIconOf(transfer.peerType)} tone="blue" size="lg" />
    </gtkbox>
    <gtkbox orientation="vertical" spacing={4} halign="center">
      <gtklabel class="qs-stage-title">Receiving from {transfer.peer}</gtklabel>
      <gtklabel class="qs-stage-subtitle">
        {bytesText(transfer.bytesDone)} of {bytesText(transfer.bytesTotal)}
      </gtklabel>
    </gtkbox>
    <gtkprogressbar class="qs-progress" value={progressOf(transfer)} width={320}></gtkprogressbar>
  </gtkbox>
{/snippet}

{#snippet done(transfer: Transfer)}
  <gtkbox class="qs-stage" orientation="vertical" spacing={16} halign="center">
    <gtkbox class="qs-success" halign="center">
      <gtkicon icon="object-select-symbolic" size={36}></gtkicon>
    </gtkbox>
    <gtkbox orientation="vertical" spacing={4} halign="center">
      {#if peerTrusted}
        <gtklabel class="qs-stage-title">{transfer.peer} is paired</gtklabel>
        <gtklabel class="qs-stage-subtitle">Its shares are accepted without asking from now on.</gtklabel>
      {:else}
        <gtklabel class="qs-stage-title">Received from {transfer.peer}</gtklabel>
        <gtklabel class="qs-stage-subtitle">It will ask again next time.</gtklabel>
      {/if}
    </gtkbox>

    {#if transfer.savedPaths.length > 0}
      <gtkbox class="qs-received" orientation="horizontal" spacing={8} halign="center">
        {#each transfer.savedPaths.slice(0, MAX_PREVIEWS) as path, index (path)}
          <gtkbox class="qs-pop qs-delay-{index}">
            <ReceivedPicture {bus} {path} size={PREVIEW_SIZE} />
          </gtkbox>
        {/each}
      </gtkbox>
    {:else if transfer.text !== ''}
      {@render incomingPreview(transfer)}
    {/if}

    <gtkbox orientation="horizontal" spacing={8} halign="center">
      <Button variant="secondary" label="Pair another" onclick={waitAgain} />
      <Button variant="primary" label="Done" onclick={onclose} />
    </gtkbox>
  </gtkbox>
{/snippet}

{#snippet failed(transfer: Transfer)}
  <gtkbox class="qs-stage" orientation="vertical" spacing={16} halign="center">
    <gtkbox halign="center">
      <IconCircle icon="dialog-warning-symbolic" tone="amber" size="lg" />
    </gtkbox>
    <gtkbox orientation="vertical" spacing={4} halign="center">
      <gtklabel class="qs-stage-title">Not paired</gtklabel>
      <gtklabel class="qs-stage-subtitle">{failureOf(transfer)}</gtklabel>
    </gtkbox>
    <gtkbox orientation="horizontal" spacing={8} halign="center">
      <Button variant="secondary" label="Cancel" onclick={onclose} />
      <Button variant="primary" label="Try again" onclick={waitAgain} />
    </gtkbox>
  </gtkbox>
{/snippet}
