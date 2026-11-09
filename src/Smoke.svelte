<script lang="ts">
  import type { BusService } from './lib/bus'
  import type { ViewRegistry } from './host/plugins/views'
  import ControlCentre from './extensions/quicksettings/ControlCentre.svelte'
  import AgendaMenu from './extensions/agenda/AgendaMenu.svelte'
  import RunCatMenu from './extensions/runcat/RunCatMenu.svelte'
  import RunCatIcon from './extensions/runcat/RunCatIcon.svelte'
  import UsbMenu from './extensions/usb/UsbMenu.svelte'
  import PomodoroMenu from './extensions/pomodoro/PomodoroMenu.svelte'
  import PomodoroIcon from './extensions/pomodoro/PomodoroIcon.svelte'
  import WifiPage from './extensions/quicksettings/WifiPage.svelte'
  import BluetoothPage from './extensions/quicksettings/BluetoothPage.svelte'
  import WidgetGallery from './extensions/neoshell/WidgetGallery.svelte'
  import Weather from './extensions/weather/Weather.svelte'
  import AirQuality from './extensions/airquality/AirQuality.svelte'
  import LockSurface from './extensions/lock/LockSurface.svelte'
  import NotchSettings from './extensions/neoshell/NotchSettings.svelte'
  import SettingsWindow from './extensions/settings/SettingsWindow.svelte'
  import DisplaysSettings from './extensions/settings/DisplaysSettings.svelte'
  import CalendarSettings from './extensions/calendar/CalendarSettings.svelte'
  import { MAX_UNIT_PX, sizePx, spanOf } from './extensions/neoshell/freeform'
  import type { BluetoothState, NetworkState } from './extensions/quicksettings/types'
  import { remoteView } from './host/clients/remoteView'

  const RemoteWeather = remoteView('weather', 'card')
  const RemoteAirQuality = remoteView('airquality', 'card')
  const RemoteRunCatMenu = remoteView('runcat', 'menu')
  const RemoteUsbMenu = remoteView('usb', 'menu')
  const RemoteAgendaMenu = remoteView('agenda', 'menu')
  const RemoteTopbar = remoteView('neoshell-bar', 'topbar')
  const RemoteControlCentre = remoteView('quicksettings', 'menu')
  const RemoteNotch = remoteView('neoshell-notch', 'notch')
  const RemoteDock = remoteView('neoshell-dock', 'dock')
  const RemoteDesktop = remoteView('neoshell-desktop', 'desktop')

  // The smoke harness's markup: every view added for the quick settings tray
  // and the widget gallery, built once in a plain window.
  //
  // The tray's detail pages are reached by clicking, and their state is the
  // panel's own — so they are mounted again here, directly, to get their
  // widgets built. Everything a page can show that a list does not (the
  // password prompt, the connection details) is ordinary labels and an entry.

  let { bus, registry }: { bus: BusService; registry: ViewRegistry } = $props()

  const networkState: NetworkState = {
    available: true,
    enabled: true,
    connected: true,
    ssid: 'smoke',
    signal: 72,
    secured: true,
    device: 'wlan0',
    ipv4: '10.0.0.2/24',
    gateway: '10.0.0.1',
    dns: ['10.0.0.1'],
  }

  const bluetoothState: BluetoothState = {
    available: true,
    powered: true,
    discovering: false,
    adapter: 'smoke',
  }

  const networks = [
    { ssid: 'smoke', signal: 72, secured: true, active: true, saved: true },
    { ssid: 'other', signal: 20, secured: false, active: false, saved: false },
  ]

  // A widget card lays itself out from the size it is given, so every size is
  // built rather than only whichever one a default would have picked.
  const CARD_SIZES = ['small', 'medium', 'large']

  function boxFor(size: string) {
    const box = sizePx(MAX_UNIT_PX, spanOf(size))
    return { size, width: box.width, height: box.height }
  }

  const devices = [
    {
      mac: '00:00:00:00:00:01',
      name: 'paired device',
      connected: true,
      paired: true,
      trusted: true,
      icon: 'audio-headset',
      battery: 80,
    },
    {
      mac: '00:00:00:00:00:02',
      name: 'nearby device',
      connected: false,
      paired: false,
      trusted: false,
      icon: '',
      battery: -1,
    },
  ]
</script>

<gtkwindow title="neoshell smoke" default-width={1400} default-height={760}>
  <gtkscrolledwindow>
    <gtkbox orientation="horizontal" spacing={16} margin={16} valign="start">
      <gtkbox class="status-menu" orientation="vertical" valign="start">
        <ControlCentre {bus} {registry} args={{ close: () => {} }} id="smoke.controlcentre" />
      </gtkbox>
      <gtkbox class="status-menu" orientation="vertical" width={328} valign="start">
        <WifiPage {bus} {networkState} {networks} onBack={() => {}} />
      </gtkbox>
      <gtkbox class="status-menu" orientation="vertical" width={328} valign="start">
        <BluetoothPage {bus} {bluetoothState} {devices} onBack={() => {}} />
      </gtkbox>
      <gtkbox class="status-menu" orientation="vertical" valign="start">
        <AgendaMenu {bus} {registry} args={{ close: () => {} }} id="smoke.agenda" />
      </gtkbox>
      <gtkbox class="status-menu" orientation="vertical" valign="start">
        <PomodoroMenu {bus} {registry} args={{ close: () => {} }} id="smoke.pomodoro" />
      </gtkbox>
      <gtkbox class="status-menu" orientation="horizontal" valign="start">
        <PomodoroIcon {bus} {registry} args={{}} id="smoke.pomodoro.icon" />
      </gtkbox>
      <gtkbox class="status-menu" orientation="vertical" valign="start">
        <UsbMenu {bus} {registry} args={{ close: () => {} }} id="smoke.usb" />
      </gtkbox>
      <gtkbox class="status-menu" orientation="vertical" valign="start">
        <RunCatMenu {bus} {registry} args={{ close: () => {} }} id="smoke.runcat" />
      </gtkbox>
      <gtkbox class="status-menu" orientation="horizontal" valign="start">
        <RunCatIcon {bus} {registry} args={{}} id="smoke.runcat.icon" />
      </gtkbox>
      <WidgetGallery {bus} {registry} args={{}} id="smoke.gallery" />

      <!-- The password prompt, the connection details and the power menu are
           reached by clicking, and their state belongs to a component this
           harness cannot drive. The widgets they build that nothing else here
           does are built directly instead, with the attributes they carry. -->
      <gtkbox class="panel" orientation="vertical" spacing={10} width={328} valign="start">
        <gtkpasswordentry
          class="qs-entry"
          placeholder="Password"
          peek
          text=""
        ></gtkpasswordentry>
        <gtkseparator class="qs-separator" orientation="horizontal"></gtkseparator>
        <gtkbox class="qs-power-menu" orientation="vertical" spacing={2}>
          <gtkbutton class="qs-power-item" frame={false}>Lock</gtkbutton>
          <gtkbutton class="qs-power-item danger" frame={false}>Power off</gtkbutton>
        </gtkbox>
        <gtkbox class="qs-details" orientation="vertical" spacing={6}>
          <gtklabel class="qs-detail-value" tabular halign="end" ellipsize="end">10.0.0.2</gtklabel>
        </gtkbox>
        <gtkbox orientation="horizontal" spacing={8} halign="end">
          <gtkbutton class="qs-button" frame={false}>Forget</gtkbutton>
          <gtkbutton class="qs-button primary" frame={false}>Connect</gtkbutton>
        </gtkbox>
      </gtkbox>

      <!-- The two cards again, run as their clients: the same views, replayed
           from the runner through the bus bridge. -->
      <gtkbox class="smoke-remote-weather" width={boxFor('small').width} height={boxFor('small').height} valign="start">
        <RemoteWeather {bus} {registry} args={boxFor('small')} id="smoke.weather.small" />
      </gtkbox>
      <gtkbox class="smoke-remote-airquality" width={boxFor('small').width} height={boxFor('small').height} valign="start">
        <RemoteAirQuality {bus} {registry} args={boxFor('small')} id="smoke.airquality.small" />
      </gtkbox>
      <!-- Status menus run as clients get a close callback they cannot call;
           the menus here only have to draw. -->
      <gtkbox class="status-menu smoke-remote-runcat" orientation="vertical" valign="start">
        <RemoteRunCatMenu {bus} {registry} args={{ close: () => {} }} id="smoke.remote.runcat" />
      </gtkbox>
      <gtkbox class="status-menu smoke-remote-usb" orientation="vertical" valign="start">
        <RemoteUsbMenu {bus} {registry} args={{ close: () => {} }} id="smoke.remote.usb" />
      </gtkbox>
      <gtkbox class="status-menu smoke-remote-agenda" orientation="vertical" valign="start">
        <RemoteAgendaMenu {bus} {registry} args={{ close: () => {} }} id="smoke.remote.agenda" />
      </gtkbox>
      <gtkbox class="status-menu smoke-remote-controlcentre" orientation="vertical" valign="start">
        <RemoteControlCentre {bus} {registry} args={{ close: () => {} }} id="smoke.remote.controlcentre" />
      </gtkbox>
      <gtkbox class="ui-dark smoke-remote-bar" width={900} height={30} valign="start">
        <RemoteTopbar {bus} {registry} args={{ centerGap: 120, monitor: '' }} id="smoke.bar" />
      </gtkbox>
      {#each CARD_SIZES as size (size)}
        {@const box = boxFor(size)}
        <gtkbox orientation="vertical" spacing={12} valign="start">
          <gtkbox width={box.width} height={box.height}>
            <Weather {bus} {registry} args={box} id={`smoke.weather.${size}`} />
          </gtkbox>
          <gtkbox width={box.width} height={box.height}>
            <AirQuality {bus} {registry} args={box} id={`smoke.airquality.${size}`} />
          </gtkbox>
        </gtkbox>
      {/each}
      <!-- The notch, run as its client, opened (notch:open is retained) on
           its Nook, which embeds the client's own media widget back, and on
           its Tray. Then both pages of its settings. -->
      <gtkbox class="ui-dark" orientation="vertical" spacing={16} valign="start">
        <gtkbox class="smoke-remote-notch" valign="start">
          <RemoteNotch {bus} {registry} args={{}} id="smoke.notch" />
        </gtkbox>
        <gtkbox class="smoke-remote-tray" valign="start">
          <RemoteNotch {bus} {registry} args={{ tab: 'tray' }} id="smoke.notch.tray" />
        </gtkbox>
        <!-- The desktop, run as its client: its folder's icons, one of them an
             image shown through its picture handle. -->
        <gtkbox class="smoke-remote-desktop" width={900} height={500} valign="start">
          <RemoteDesktop {bus} {registry} args={{ monitor: '', mainMonitor: true, widgets: [] }} id="smoke.desktop" />
        </gtkbox>
        <!-- The dock, run as its client, with a tile for the one open window. -->
        <gtkbox class="smoke-remote-dock" width={560} height={96} valign="start">
          <RemoteDock {bus} {registry} args={{}} id="smoke.dock" />
        </gtkbox>
      </gtkbox>
      <gtkbox class="ui-light" orientation="vertical" spacing={16} width={720} valign="start">
        <NotchSettings {bus} {registry} args={{}} id="smoke.notch.general" />
        <NotchSettings {bus} {registry} args={{ page: 'widgets' }} id="smoke.notch.widgets" />
        <DisplaysSettings {bus} {registry} args={{}} id="smoke.displays" />
        <CalendarSettings {bus} {registry} args={{}} id="smoke.calendar" />
      </gtkbox>
      <!-- One monitor's lock surface, in a box instead of a session-lock
           window: the compositor lock is what the smoke must never take. -->
      <gtkbox width={960} height={540}>
        <LockSurface {bus} {registry} onunlock={() => {}} />
      </gtkbox>
    </gtkbox>
  </gtkscrolledwindow>
</gtkwindow>

<!-- A window of its own; settings:open is retained, so it opens. -->
<SettingsWindow {bus} {registry} args={{}} id="smoke.settings" />
