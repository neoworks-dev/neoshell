<script lang="ts">
  import GLib from 'gi://GLib'
  import { untrack } from 'svelte'
  import { errorOf, subscribeTo } from '../../lib/bus'
  import { arrayOf, numberOf, recordOf, stringListOf, stringOf } from '../../lib/record'
  import { Settings } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import { thumbnailTexture } from '../neoshell/trayFiles'
  import SliderRow from './SliderRow.svelte'
  import WifiPage from './WifiPage.svelte'
  import BluetoothPage from './BluetoothPage.svelte'
  import { deviceIcon, iconName, signalIcon, signalLabel } from './icons'
  import type { BluetoothDevice, BluetoothState, NetworkState, WifiNetwork } from './types'

  // The Control Centre: the quick settings status item's menu. Every block is
  // there only when what it controls exists on this machine — its backend has
  // published, or its tool is installed — so nothing on it is a dead switch.

  const COMMAND_TIMEOUT_MS = 5000
  const RADIO_TIMEOUT_MS = 15000
  const WIDTH = 344
  const AVATAR_SIZE = 44
  const ART_SIZE = 44
  const SCREENSHOT_COMMAND = 'grim -g "$(slurp)"'
  const POWER_ACTIONS = [
    { action: 'lock', label: 'Lock', icon: 'system-lock-screen-symbolic' },
    { action: 'logout', label: 'Log out', icon: 'system-log-out-symbolic' },
    { action: 'suspend', label: 'Sleep', icon: 'weather-clear-night-symbolic' },
    { action: 'reboot', label: 'Restart', icon: 'system-reboot-symbolic' },
    { action: 'poweroff', label: 'Shut down', icon: 'system-shutdown-symbolic' },
  ]
  const PROFILE_LABELS: Record<string, string> = {
    'power-saver': 'Power saver',
    balanced: 'Balanced',
    performance: 'Performance',
  }

  type Page = 'main' | 'wifi' | 'bluetooth' | 'power'

  interface Track {
    title: string
    artist: string
    art: string
    playing: boolean
  }

  let { bus, args }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))
  const canScreenshot = hasPrograms(['grim', 'slurp'])
  const realName = displayNameOf(GLib.get_real_name(), GLib.get_user_name())
  const accountLabel = `${GLib.get_user_name()}@${GLib.get_host_name()}`
  const avatar = thumbnailOrNull(GLib.build_filenamev([GLib.get_home_dir(), '.face']))

  let page = $state<Page>('main')
  let network = $state<NetworkState | null>(null)
  let networks = $state<WifiNetwork[]>([])
  let wired = $state<Record<string, unknown>>({})
  let bluetooth = $state<BluetoothState | null>(null)
  let devices = $state<BluetoothDevice[]>([])
  let volume = $state(-1)
  let muted = $state(false)
  let profile = $state<{ active: string; profiles: string[] } | null>(null)
  let quickShareAvailable = $state(false)
  let track = $state<Track | null>(null)

  const connectedDevice = $derived(devices.find((device) => device.connected))
  const receiving = $derived(settings.string('quickshare.visibility', 'invisible') === 'visible')
  const wifiPresent = $derived(network !== null && network.available)
  const wiredPresent = $derived(wired.available === true)
  // Decoded once per track, not on every render.
  const artTexture = $derived(artTextureOf(track))

  $effect(() => settings.connect())
  $effect(() => subscribeTo(bus, 'network.state', (message) => (network = networkStateOf(message.data))))
  $effect(() => subscribeTo(bus, 'network.networks', (message) => (networks = networksOf(message.data))))
  $effect(() => subscribeTo(bus, 'network.wired', (message) => (wired = recordOf(message.data))))
  $effect(() => subscribeTo(bus, 'bluetooth.state', (message) => (bluetooth = bluetoothStateOf(message.data))))
  $effect(() => subscribeTo(bus, 'bluetooth.devices', (message) => (devices = devicesOf(message.data))))
  $effect(() => subscribeTo(bus, 'system.volume', (message) => applyVolume(message.data)))
  $effect(() => subscribeTo(bus, 'system.powerprofile', (message) => (profile = profileOf(message.data))))
  $effect(() =>
    subscribeTo(bus, 'quickshare.state', (message) => {
      quickShareAvailable = recordOf(message.data).available === true
    }),
  )
  $effect(() => subscribeTo(bus, 'media.player', (message) => (track = trackOf(message.data))))

  function close(): void {
    const closeMenu = recordOf(args).close
    if (typeof closeMenu === 'function') {
      closeMenu()
    }
  }

  function hasPrograms(names: string[]): boolean {
    return names.every((name) => GLib.find_program_in_path(name) !== null)
  }

  function displayNameOf(realNameValue: string, userName: string): string {
    if (realNameValue === '' || realNameValue === 'Unknown') {
      return userName
    }
    return realNameValue
  }

  function thumbnailOrNull(path: string) {
    if (!GLib.file_test(path, GLib.FileTest.EXISTS)) {
      return null
    }
    return thumbnailTexture(path, AVATAR_SIZE * 2)
  }

  function initialOf(name: string): string {
    return name.slice(0, 1).toUpperCase()
  }

  // ── actions ──

  function openSettings(): void {
    close()
    bus.publish('settings:open', {})
  }

  async function runPowerAction(action: string): Promise<void> {
    close()
    const error = errorOf(await bus.call('system:power', { action }, COMMAND_TIMEOUT_MS))
    if (error !== '') {
      console.error(`control centre: ${action} failed:`, error)
    }
  }

  function captureScreen(): void {
    close()
    void bus.call('hypr:dispatch', { dispatcher: 'exec', arg: SCREENSHOT_COMMAND }, COMMAND_TIMEOUT_MS)
  }

  function toggleWifi(): void {
    if (network === null) {
      return
    }
    void bus.call('network:enable', { enabled: !network.enabled }, RADIO_TIMEOUT_MS)
  }

  function toggleBluetooth(): void {
    if (bluetooth === null) {
      return
    }
    void bus.call('bluetooth:power', { powered: !bluetooth.powered }, RADIO_TIMEOUT_MS)
  }

  function cycleProfile(): void {
    if (profile === null || profile.profiles.length === 0) {
      return
    }
    const next = profile.profiles[(profile.profiles.indexOf(profile.active) + 1) % profile.profiles.length]
    profile = { ...profile, active: next }
    void bus.call('system:setPowerProfile', { profile: next }, COMMAND_TIMEOUT_MS)
  }

  function toggleReceiving(): void {
    if (receiving) {
      settings.set('quickshare.visibility', 'invisible')
      return
    }
    settings.set('quickshare.visibility', 'visible')
  }

  function setVolume(percent: number): void {
    volume = percent
    void bus.call('system:setVolume', { volume: percent }, COMMAND_TIMEOUT_MS)
  }

  function toggleMute(): void {
    muted = !muted
    void bus.call('system:setMuted', { muted }, COMMAND_TIMEOUT_MS)
  }

  function send(action: string): void {
    void bus.call(action, {}, COMMAND_TIMEOUT_MS)
  }

  // ── labels ──

  function networkTitle(): string {
    if (wifiPresent && network !== null && network.connected) {
      return network.ssid
    }
    if (wifiPresent) {
      return 'Wi-Fi'
    }
    return 'Ethernet'
  }

  function networkSubtitle(): string {
    if (wifiPresent && network !== null) {
      return wifiState(network)
    }
    if (wired.connected === true) {
      return 'Connected'
    }
    return 'Cable unplugged'
  }

  function wifiState(state: NetworkState): string {
    if (!state.enabled) {
      return 'Off'
    }
    if (!state.connected) {
      return 'Not connected'
    }
    return signalLabel(state.signal)
  }

  function networkIcon(): string {
    if (wifiPresent && network !== null) {
      return iconName(signalIcon(network.signal, network.connected))
    }
    return 'network-wired-symbolic'
  }

  function networkActive(): boolean {
    if (wifiPresent && network !== null) {
      return network.enabled
    }
    return wired.connected === true
  }

  function bluetoothSubtitle(state: BluetoothState): string {
    if (!state.powered) {
      return 'Off'
    }
    if (connectedDevice !== undefined) {
      return `${connectedDevice.name} · Connected`
    }
    return 'On'
  }

  function bluetoothIcon(): string {
    if (connectedDevice === undefined) {
      return iconName('bluetooth')
    }
    return iconName(deviceIcon(connectedDevice.icon))
  }

  function profileIcon(active: string): string {
    return `power-profile-${active}-symbolic`
  }

  function profileLabel(active: string): string {
    const label = PROFILE_LABELS[active]
    if (label === undefined) {
      return active
    }
    return label
  }

  function receivingLabel(isReceiving: boolean): string {
    if (isReceiving) {
      return 'Receiving'
    }
    return 'Off'
  }

  function circleClass(active: boolean): string {
    if (active) {
      return 'cc-circle cc-circle-on'
    }
    return 'cc-circle'
  }

  function volumeIcon(isMuted: boolean): string {
    if (isMuted) {
      return 'volumeMuted'
    }
    return 'volume'
  }

  function playIcon(isPlaying: boolean): string {
    if (isPlaying) {
      return 'media-playback-pause-symbolic'
    }
    return 'media-playback-start-symbolic'
  }

  // ── topic readers ──

  function applyVolume(data: unknown): void {
    const record = recordOf(data)
    volume = numberOf(record.volume, volume)
    muted = record.muted === true
  }

  function profileOf(data: unknown): { active: string; profiles: string[] } | null {
    const record = recordOf(data)
    const active = stringOf(record.active)
    if (active === '') {
      return null
    }
    return { active, profiles: stringListOf(record.profiles) }
  }

  function trackOf(data: unknown): Track | null {
    const record = recordOf(data)
    const title = stringOf(record.title)
    if (title === '') {
      return null
    }
    return {
      title,
      artist: stringOf(record.artist),
      art: localArtOf(stringOf(record.artUrl)),
      playing: stringOf(record.status) === 'Playing',
    }
  }

  function artTextureOf(current: Track | null) {
    if (current === null || current.art === '') {
      return null
    }
    return thumbnailTexture(current.art, ART_SIZE * 2)
  }

  // Remote art would have to be downloaded first and is left out.
  function localArtOf(artUrl: string): string {
    if (!artUrl.startsWith('file://')) {
      return ''
    }
    return decodeURIComponent(artUrl.slice('file://'.length))
  }

  function networkStateOf(data: unknown): NetworkState {
    const record = recordOf(data)
    return {
      available: record.available === true,
      enabled: record.enabled === true,
      connected: record.connected === true,
      ssid: stringOf(record.ssid),
      signal: numberOf(record.signal, 0),
      secured: record.secured === true,
      device: stringOf(record.device),
      ipv4: stringOf(record.ipv4),
      gateway: stringOf(record.gateway),
      dns: stringListOf(record.dns),
    }
  }

  function networksOf(data: unknown): WifiNetwork[] {
    return arrayOf(data).map((record) => ({
      ssid: stringOf(record.ssid),
      signal: numberOf(record.signal, 0),
      secured: record.secured === true,
      active: record.active === true,
      saved: record.saved === true,
    }))
  }

  function bluetoothStateOf(data: unknown): BluetoothState {
    const record = recordOf(data)
    return {
      available: record.available === true,
      powered: record.powered === true,
      discovering: record.discovering === true,
      adapter: stringOf(record.adapter),
    }
  }

  function devicesOf(data: unknown): BluetoothDevice[] {
    return arrayOf(data).map((record) => ({
      mac: stringOf(record.mac),
      name: stringOf(record.name),
      connected: record.connected === true,
      paired: record.paired === true,
      trusted: record.trusted === true,
      icon: stringOf(record.icon),
      battery: numberOf(record.battery, -1),
    }))
  }
</script>

<!-- Each page is a fresh box, so switching pages replays .cc-page's slide. -->
<gtkbox class="control-centre" orientation="vertical" width={WIDTH}>
  {#key page}
    <gtkbox class="cc-page" orientation="vertical" spacing={10}>
      {#if page === 'wifi' && network !== null}
        <WifiPage {bus} networkState={network} {networks} onBack={() => (page = 'main')} />
      {:else if page === 'bluetooth' && bluetooth !== null}
        <BluetoothPage {bus} bluetoothState={bluetooth} {devices} onBack={() => (page = 'main')} />
      {:else if page === 'power'}
        {@render powerPage()}
      {:else}
        {@render header()}
        {@render tiles()}
        {#if volume >= 0}
          <gtkbox class="cc-block" orientation="vertical" spacing={8}>
            <SliderRow icon={volumeIcon(muted)} label="Volume" value={volume} onInput={setVolume} onIconClick={toggleMute} />
          </gtkbox>
        {/if}
        {#if track !== null}
          {@render media(track)}
        {/if}
      {/if}
    </gtkbox>
  {/key}
</gtkbox>

{#snippet header()}
  <gtkbox orientation="horizontal" spacing={12}>
    {#if avatar !== null}
      <gtkbox class="cc-avatar" clip valign="center">
        <gtkpicture paintable={avatar} fit="cover" shrink width={AVATAR_SIZE} height={AVATAR_SIZE}></gtkpicture>
      </gtkbox>
    {:else}
      <gtkbox
        class="cc-avatar"
        css="min-width: {AVATAR_SIZE}px; min-height: {AVATAR_SIZE}px;"
        valign="center"
        hexpand={false}
        homogeneous
      >
        <gtklabel class="cc-avatar-initial">{initialOf(realName)}</gtklabel>
      </gtkbox>
    {/if}
    <gtkbox orientation="vertical" spacing={0} hexpand valign="center">
      <gtklabel class="cc-name" halign="start" ellipsize="end">{realName}</gtklabel>
      <gtklabel class="cc-account" halign="start" ellipsize="end">{accountLabel}</gtklabel>
    </gtkbox>
    <gtkbox class="cc-pill" orientation="horizontal" valign="center">
      <gtkbutton class="cc-pill-button" frame={false} tooltip="Settings" onclicked={openSettings}>
        <gtkicon icon={iconName('settings')} size={16}></gtkicon>
      </gtkbutton>
      <gtkseparator class="cc-pill-divider" orientation="vertical"></gtkseparator>
      <gtkbutton class="cc-pill-button" frame={false} tooltip="Power" onclicked={() => (page = 'power')}>
        <gtkicon icon={iconName('power')} size={16}></gtkicon>
      </gtkbutton>
    </gtkbox>
  </gtkbox>
{/snippet}

{#snippet tiles()}
  <gtkbox orientation="horizontal" spacing={10}>
    {#if wifiPresent || wiredPresent || (bluetooth !== null && bluetooth.available)}
      <gtkbox class="cc-block cc-connectivity" orientation="vertical" spacing={10} hexpand>
        {#if wifiPresent || wiredPresent}
          {@render connection(networkIcon(), networkTitle(), networkSubtitle(), networkActive(), wifiPresent)}
        {/if}
        {#if bluetooth !== null && bluetooth.available}
          {@render bluetoothRow(bluetooth)}
        {/if}
      </gtkbox>
    {/if}
    {#if profile !== null}
      {@render tile(profileIcon(profile.active), 'Power mode', profileLabel(profile.active), profile.active !== 'balanced', cycleProfile)}
    {/if}
  </gtkbox>
  {#if canScreenshot || quickShareAvailable}
    <gtkbox orientation="horizontal" spacing={10} homogeneous>
      {#if canScreenshot}
        {@render tile('camera-photo-symbolic', 'Screenshot', 'Select an area', false, captureScreen)}
      {/if}
      {#if quickShareAvailable}
        {@render tile('send-to-symbolic', 'Quick Share', receivingLabel(receiving), receiving, toggleReceiving)}
      {/if}
    </gtkbox>
  {/if}
{/snippet}

<!-- A Wi-Fi row toggles the radio from its circle and opens the network list
     from its text; a wired row only reports. -->
{#snippet connection(icon: string, title: string, subtitle: string, active: boolean, isWifi: boolean)}
  <gtkbox orientation="horizontal" spacing={10}>
    <gtkbutton class={circleClass(active)} frame={false} sensitive={isWifi} onclicked={toggleWifi}>
      <gtkicon {icon} size={16}></gtkicon>
    </gtkbutton>
    <gtkbutton class="cc-row-text" frame={false} hexpand sensitive={isWifi} onclicked={() => (page = 'wifi')}>
      <gtkbox orientation="vertical" spacing={0}>
        <gtklabel class="cc-title" halign="start" ellipsize="end">{title}</gtklabel>
        <gtklabel class="cc-subtitle" halign="start" ellipsize="end">{subtitle}</gtklabel>
      </gtkbox>
    </gtkbutton>
  </gtkbox>
{/snippet}

{#snippet bluetoothRow(state: BluetoothState)}
  <gtkbox orientation="horizontal" spacing={10}>
    <gtkbutton class={circleClass(state.powered)} frame={false} onclicked={toggleBluetooth}>
      <gtkicon icon={bluetoothIcon()} size={16}></gtkicon>
    </gtkbutton>
    <gtkbutton class="cc-row-text" frame={false} hexpand onclicked={() => (page = 'bluetooth')}>
      <gtkbox orientation="vertical" spacing={0}>
        <gtklabel class="cc-title" halign="start">Bluetooth</gtklabel>
        <gtklabel class="cc-subtitle" halign="start" ellipsize="end">{bluetoothSubtitle(state)}</gtklabel>
      </gtkbox>
    </gtkbutton>
  </gtkbox>
{/snippet}

{#snippet tile(icon: string, title: string, subtitle: string, active: boolean, onpress: () => void)}
  <gtkbutton class="cc-block cc-tile" frame={false} hexpand onclicked={onpress}>
    <gtkbox orientation="vertical" spacing={8}>
      <gtkbox class={circleClass(active)} halign="start">
        <gtkicon {icon} size={16} hexpand vexpand></gtkicon>
      </gtkbox>
      <gtkbox orientation="vertical" spacing={0}>
        <gtklabel class="cc-title" halign="start" ellipsize="end">{title}</gtklabel>
        <gtklabel class="cc-subtitle" halign="start" ellipsize="end">{subtitle}</gtklabel>
      </gtkbox>
    </gtkbox>
  </gtkbutton>
{/snippet}

{#snippet media(current: Track)}
  <gtkbox class="cc-block cc-media" orientation="horizontal" spacing={12}>
    <gtkbox
      class="cc-art"
      clip
      css="min-width: {ART_SIZE}px; min-height: {ART_SIZE}px;"
      valign="center"
      hexpand={false}
      homogeneous
    >
      {#if artTexture !== null}
        <gtkpicture paintable={artTexture} fit="cover" shrink width={ART_SIZE} height={ART_SIZE}></gtkpicture>
      {:else}
        <gtkicon icon="audio-x-generic-symbolic" size={20} hexpand vexpand></gtkicon>
      {/if}
    </gtkbox>
    <gtkbox orientation="vertical" spacing={0} hexpand valign="center">
      <gtklabel class="cc-title" halign="start" ellipsize="end">{current.title}</gtklabel>
      <gtklabel class="cc-subtitle" halign="start" ellipsize="end">{current.artist}</gtklabel>
    </gtkbox>
    <gtkbutton class="cc-media-button" frame={false} valign="center" onclicked={() => send('media:playPause')}>
      <gtkicon icon={playIcon(current.playing)} size={18}></gtkicon>
    </gtkbutton>
    <gtkbutton class="cc-media-button" frame={false} valign="center" onclicked={() => send('media:next')}>
      <gtkicon icon="media-skip-forward-symbolic" size={18}></gtkicon>
    </gtkbutton>
  </gtkbox>
{/snippet}

{#snippet powerPage()}
  <gtkbox orientation="horizontal" spacing={8}>
    <gtkbutton class="cc-pill-button" frame={false} tooltip="Back" onclicked={() => (page = 'main')}>
      <gtkicon icon={iconName('chevronLeft')} size={16}></gtkicon>
    </gtkbutton>
    <gtklabel class="cc-name" halign="start" valign="center">Power</gtklabel>
  </gtkbox>
  <gtkbox class="cc-block" orientation="vertical" spacing={2}>
    {#each POWER_ACTIONS as entry (entry.action)}
      <gtkbutton class="cc-power-item" frame={false} onclicked={() => void runPowerAction(entry.action)}>
        <gtkbox orientation="horizontal" spacing={10}>
          <gtkicon icon={entry.icon} size={16}></gtkicon>
          <gtklabel halign="start">{entry.label}</gtklabel>
        </gtkbox>
      </gtkbutton>
    {/each}
  </gtkbox>
{/snippet}
