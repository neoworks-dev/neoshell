<script lang="ts">
  import {
    Button,
    Chip,
    IconButton,
    IconCircle,
    List,
    ListRow,
    SectionHeader,
    SegmentedButton,
    TextField,
  } from '@neoworks/gtk-ui'
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { recordOf, stringListOf } from '../../lib/record'
  import { Settings } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import { historyOf, pairedDevicesOf } from './history'
  import type { HistoryEntry, PairedDevice } from './history'
  import type { Device, QuickShareState } from './state'
  import { initialState } from './state'
  import {
    agoText,
    deviceIconOf,
    deviceKindOf,
    receivedPicturesOf,
    shareDetailOf,
    shareIconOf,
    shareTitleOf,
  } from './present'
  import Pairing from './Pairing.svelte'
  import ReceivedPicture from './ReceivedPicture.svelte'

  // Settings → Quick Share: this computer as phones see it, the devices
  // paired with it, the ones nearby right now, and what was shared lately.
  // Pairing has a screen of its own (Pairing.svelte).
  //
  // Nearby devices are only found while discovery runs, so the page runs it
  // for as long as it is open.

  const CALL_TIMEOUT_MS = 5000
  const CLOCK_TICK_MS = 30000
  const RECENT_SHARES = 8
  const PICTURE_STRIP = 8
  const STRIP_PICTURE_SIZE = 84
  const ROW_PICTURE_SIZE = 40
  const VISIBILITY_OPTIONS = [
    { value: 'invisible', label: 'Hidden', icon: 'view-conceal-symbolic' },
    { value: 'visible', label: 'Everyone', icon: 'view-reveal-symbolic' },
  ]

  let { bus }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))

  let shareState = $state.raw<QuickShareState>(initialState())
  let history = $state.raw<HistoryEntry[]>([])
  let pairing = $state(false)
  let now = $state(Date.now())

  const visibility = $derived(settings.string('quickshare.visibility', 'invisible'))
  const deviceName = $derived(settings.string('quickshare.deviceName', ''))
  const downloadDir = $derived(settings.string('quickshare.downloadDir', ''))
  const trusted = $derived(stringListOf(settings.value('quickshare.trusted')))
  const paired = $derived(pairedDevicesOf(trusted, history))
  const pictures = $derived(receivedPicturesOf(history, PICTURE_STRIP))
  const received = $derived(history.filter((entry) => entry.direction === 'incoming').length)
  // Its own value, so the discovery effect does not rerun on every publish:
  // discovering publishes the state again, which would turn it off and on.
  const available = $derived(shareState.available)

  $effect(() => settings.connect())

  $effect(() =>
    subscribeTo(bus, 'quickshare.state', (message) => {
      shareState = recordOf(message.data) as unknown as QuickShareState
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'quickshare.history', (message) => {
      history = historyOf(recordOf(message.data).entries)
    }),
  )

  $effect(() => {
    const timer = setInterval(() => {
      now = Date.now()
    }, CLOCK_TICK_MS)
    return () => clearInterval(timer)
  })

  $effect(() => {
    if (pairing || !available) {
      return
    }
    void call('quickshare:discover', { on: true })
    return () => {
      void call('quickshare:discover', { on: false })
    }
  })

  async function call(type: string, data: Record<string, unknown>): Promise<void> {
    try {
      await bus.call(type, data, CALL_TIMEOUT_MS)
    } catch (error) {
      console.error(`quickshare: ${type} failed:`, error)
    }
  }

  function trust(name: string): void {
    if (name === '' || trusted.includes(name)) {
      return
    }
    settings.set('quickshare.trusted', [...trusted, name])
  }

  function forget(name: string): void {
    settings.set(
      'quickshare.trusted',
      trusted.filter((entry) => entry !== name),
    )
  }

  function statusOf(state: QuickShareState, chosen: string): string {
    if (!state.available) {
      return state.reason
    }
    if (state.visibility === 'temporarily') {
      return 'Visible to everyone nearby for a minute'
    }
    if (chosen === 'visible') {
      return 'Phones nearby can share to this computer'
    }
    return 'Hidden: nothing can share to this computer'
  }

  function beaconClass(state: QuickShareState, chosen: string): string {
    if (state.available && (chosen === 'visible' || state.visibility === 'temporarily')) {
      return 'qs-beacon qs-beacon-on'
    }
    return 'qs-beacon'
  }

  function shownName(name: string): string {
    if (name === '') {
      return 'This computer'
    }
    return name
  }

  function pairedDetailOf(device: PairedDevice, time: number): string {
    if (device.shares === 0) {
      return 'Has not shared yet'
    }
    const kind = deviceKindOf(device.deviceType)
    return `${kind} · ${sharesText(device.shares)} · last ${agoText(device.lastShareAt, time)}`
  }

  function sharesText(count: number): string {
    if (count === 1) {
      return '1 share'
    }
    return `${count} shares`
  }

  function nearbyEmptyTitle(state: QuickShareState): string {
    if (!state.available) {
      return 'Quick Share is not running'
    }
    return 'Looking for devices…'
  }

  function downloadDirText(path: string): string {
    if (path === '') {
      return 'Downloads'
    }
    return path
  }

  function open(path: string): void {
    void call('quickshare:open', { path })
  }

  function openShare(entry: HistoryEntry): void {
    const first = entry.savedPaths[0]
    if (first !== undefined) {
      open(first)
    }
  }

  function isOpenable(entry: HistoryEntry): boolean {
    return entry.savedPaths.length > 0
  }

  function firstPictureOf(entry: HistoryEntry): string {
    const first = entry.savedPaths[0]
    if (first === undefined) {
      return ''
    }
    return first
  }

  function isNearbyPaired(device: Device): boolean {
    return trusted.includes(device.name)
  }
</script>

{#if pairing}
  <Pairing
    {bus}
    {shareState}
    {deviceName}
    {trusted}
    ontrust={trust}
    onclose={() => (pairing = false)}
  />
{:else}
  <gtkbox class="settings-content" orientation="vertical" spacing={8}>
    {@render hero()}
    {@render yourDevices()}
    {@render nearby()}
    {@render recent()}
    {@render options()}
  </gtkbox>
{/if}

{#snippet hero()}
  <gtkbox class="qs-hero" orientation="vertical" spacing={16}>
    <gtkbox orientation="horizontal" spacing={16}>
      <gtkoverlay class={beaconClass(shareState, visibility)} valign="center">
        <gtkbox width={64} height={64}></gtkbox>
        <gtkbox overlay class="qs-beacon-ring" halign="center" valign="center" width={64} height={64}></gtkbox>
        <gtkbox overlay class="qs-beacon-core" halign="center" valign="center">
          <gtkicon icon="computer-symbolic" size={26}></gtkicon>
        </gtkbox>
      </gtkoverlay>
      <gtkbox orientation="vertical" spacing={2} valign="center" hexpand>
        <gtklabel class="qs-hero-title" xalign={0} ellipsize="end">{shownName(deviceName)}</gtklabel>
        <gtklabel class="qs-hero-status" xalign={0} wrap>{statusOf(shareState, visibility)}</gtklabel>
      </gtkbox>
      <gtkbox valign="center">
        <SegmentedButton
          label="Who can share to this computer"
          options={VISIBILITY_OPTIONS}
          value={visibility}
          size="sm"
          onchange={(value) => settings.set('quickshare.visibility', value)}
        />
      </gtkbox>
    </gtkbox>
    <gtkbox orientation="horizontal" spacing={8}>
      <Chip label="{paired.length} paired" icon="phone-symbolic" />
      <Chip label="{received} received" icon="folder-download-symbolic" />
      <gtkbox hexpand></gtkbox>
      <Button
        variant="primary"
        size="sm"
        icon="list-add-symbolic"
        label="Pair a device"
        disabled={!shareState.available}
        onclick={() => (pairing = true)}
      />
    </gtkbox>
  </gtkbox>
{/snippet}

{#snippet yourDevices()}
  <SectionHeader
    title="Your devices"
    description="Shares from these are accepted without asking. A device is known by the name it announces, which anyone nearby could copy."
    level={3}
  />
  <List variant="card" dividers>
    {#each paired as device (device.name)}
      <ListRow title={device.name} subtitle={pairedDetailOf(device, now)}>
        {#snippet leading()}
          <IconCircle icon={deviceIconOf(device.deviceType)} tone="blue" size="sm" />
        {/snippet}
        {#snippet trailing()}
          <IconButton icon="user-trash-symbolic" label="Unpair {device.name}" size="sm" onclick={() => forget(device.name)} />
        {/snippet}
      </ListRow>
    {:else}
      <ListRow title="No paired devices" subtitle="Pair a phone to have its shares land here without asking.">
        {#snippet leading()}
          <IconCircle icon="phone-symbolic" size="sm" />
        {/snippet}
        {#snippet trailing()}
          <Button size="sm" label="Pair" disabled={!shareState.available} onclick={() => (pairing = true)} />
        {/snippet}
      </ListRow>
    {/each}
  </List>
{/snippet}

{#snippet nearby()}
  <SectionHeader title="Nearby" description="Devices with Quick Share open, found while this page is shown." level={3} />
  <List variant="card" dividers>
    {#each shareState.devices as device (device.id)}
      <ListRow title={device.name} subtitle={deviceKindOf(device.deviceType)}>
        {#snippet leading()}
          <IconCircle icon={deviceIconOf(device.deviceType)} size="sm" />
        {/snippet}
        {#snippet trailing()}
          {#if isNearbyPaired(device)}
            <Chip label="Paired" icon="object-select-symbolic" />
          {:else}
            <Button size="sm" label="Add to your devices" onclick={() => trust(device.name)} />
          {/if}
        {/snippet}
      </ListRow>
    {:else}
      <ListRow title={nearbyEmptyTitle(shareState)} subtitle="On a phone, open Quick Share to make it show up here.">
        {#snippet leading()}
          <gtkbox width={32} height={32} halign="start">
            {#if shareState.available}
              <gtkspinner spinning halign="center" valign="center"></gtkspinner>
            {/if}
          </gtkbox>
        {/snippet}
      </ListRow>
    {/each}
  </List>
{/snippet}

{#snippet recent()}
  <gtkbox orientation="horizontal" spacing={8}>
    <gtkbox hexpand>
      <SectionHeader title="Recent shares" description="Saved to {downloadDirText(downloadDir)}." level={3} />
    </gtkbox>
    {#if history.length > 0}
      <gtkbox valign="end">
        <Button variant="ghost" size="sm" label="Clear" onclick={() => call('quickshare:clearHistory', {})} />
      </gtkbox>
    {/if}
  </gtkbox>

  {#if pictures.length > 0}
    <gtkscrolledwindow vscroll="never" min-content-height={STRIP_PICTURE_SIZE + 8}>
      <gtkbox class="qs-strip" orientation="horizontal" spacing={8}>
        {#each pictures as path, index (path)}
          <gtkbutton class="qs-strip-item" frame={false} tooltip="Open" onclicked={() => open(path)}>
            <gtkbox class="qs-pop qs-delay-{index}">
              <ReceivedPicture {bus} {path} size={STRIP_PICTURE_SIZE} />
            </gtkbox>
          </gtkbutton>
        {/each}
      </gtkbox>
    </gtkscrolledwindow>
  {/if}

  <List variant="card" dividers>
    {#each history.slice(0, RECENT_SHARES) as entry (entry.id)}
      {@render shareRow(entry)}
    {:else}
      <ListRow title="Nothing shared yet" subtitle="Files sent to or from this computer show up here.">
        {#snippet leading()}
          <IconCircle icon="send-to-symbolic" size="sm" />
        {/snippet}
      </ListRow>
    {/each}
  </List>
{/snippet}

{#snippet shareRow(entry: HistoryEntry)}
  {#if isOpenable(entry)}
    <ListRow title={shareTitleOf(entry)} subtitle={shareDetailOf(entry, now)} onclick={() => openShare(entry)} chevron>
      {#snippet leading()}
        <ReceivedPicture {bus} path={firstPictureOf(entry)} size={ROW_PICTURE_SIZE} />
      {/snippet}
    </ListRow>
  {:else}
    <ListRow title={shareTitleOf(entry)} subtitle={shareDetailOf(entry, now)}>
      {#snippet leading()}
        <IconCircle icon={shareIconOf(entry)} size="sm" />
      {/snippet}
    </ListRow>
  {/if}
{/snippet}

{#snippet options()}
  <SectionHeader title="Options" level={3} />
  <List variant="card" dividers>
    <ListRow title="Device name" subtitle="What phones see; Enter saves it. Empty uses the host name.">
      {#snippet trailing()}
        <gtkbox css="min-width: 220px;">
          <TextField
            label="Device name"
            hideLabel
            value={deviceName}
            onsubmit={(name) => settings.set('quickshare.deviceName', name.trim())}
          />
        </gtkbox>
      {/snippet}
    </ListRow>
    <ListRow title="Save to" subtitle="The folder received files go to; Enter saves it. Empty uses Downloads.">
      {#snippet trailing()}
        <gtkbox css="min-width: 220px;">
          <TextField
            label="Save to"
            hideLabel
            placeholder="~/Downloads"
            value={downloadDir}
            onsubmit={(path) => settings.set('quickshare.downloadDir', path.trim())}
          />
        </gtkbox>
      {/snippet}
    </ListRow>
  </List>
{/snippet}
