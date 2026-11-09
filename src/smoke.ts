// The library must be imported before anything that pulls in Svelte's client
// runtime: it installs the DOM globals that runtime reads at module scope.
import { start } from '@neoworks/svelte-gtk4'
import GLib from 'gi://GLib'
import Gtk from 'gi://Gtk?version=4.0'
import System from 'system'
import { Bus } from './host/bus.js'
import { EXTENSIONS } from './extensions/index.js'
import { startClients } from './host/clients/index.js'
import { ViewRegistry } from './host/plugins/views.js'
import Smoke from './Smoke.svelte'
import SmokeCard from './SmokeCard.svelte'
import NookMedia from './extensions/neoshell/NookMedia.svelte'
import NookCalendar from './extensions/neoshell/NookCalendar.svelte'
import NotchSettings from './extensions/neoshell/NotchSettings.svelte'
import { notchWidgetCatalog, settingsCatalog } from './host/plugins/extensions.js'

// Builds every view in the shell once, in a plain window, and exits. `tsc`
// cannot see a GTK setter that does not exist — the typings run behind the
// installed GTK and several had to be reached through `as any` — so this is
// what catches one.
//
// It is deliberately not the shell: `main.ts` maps layer surfaces across the
// whole output and takes over the session it is run in. Nothing here touches
// the layer shell, and nothing here spawns nmcli or bluetoothctl: the state
// the views read is published onto a bus of its own.

const EXIT_AFTER_MS = 2000

const bus = new Bus()
const registry = new ViewRegistry()
startClients(bus, (name) => EXTENSIONS[name].manifest.client)

// The gallery lists what the catalog holds and previews each entry with the
// registered view for its type, so a catalog with no provider behind it would
// build the empty branch and nothing else.
registry.register('smoke.card', SmokeCard)
bus.retain('widgets.catalog', {
  widgets: [
    {
      type: 'smoke.card',
      name: 'Smoke card',
      category: 'Smoke',
      description: 'a widget to preview',
      sizes: ['small'],
      defaultSize: 'small',
    },
  ],
})

// The Nook's widgets and the Settings window's tabs, from the real manifests.
registry.register('neoshell.nook.media', NookMedia)
registry.register('neoshell.nook.calendar', NookCalendar)
registry.register('neoshell.notch.settings', NotchSettings)
bus.retain('notch.catalog', { widgets: notchWidgetCatalog() })
bus.retain('settings.catalog', { sections: settingsCatalog() })

const smokeToday = new Date()
const smokeDay = `${smokeToday.getFullYear()}-${String(smokeToday.getMonth() + 1).padStart(2, '0')}-${String(smokeToday.getDate()).padStart(2, '0')}`
bus.retain('config', {
  agenda: {
    tasks: [
      { id: 'task-a', title: 'Send the weekly update', done: false, day: smokeDay },
      { id: 'task-b', title: 'Water the plants', done: true, day: smokeDay },
    ],
  },
})

bus.retain('pomodoro.state', { durationSeconds: 1500, remainingSeconds: 1234, running: true, endsAt: Date.now() + 1_234_000 })

bus.retain('usb.devices', {
  devices: [
    {
      id: '1-1',
      name: 'Smoke Keyboard',
      vendor: 'Smoke Inc.',
      vendorId: '1234',
      productId: 'abcd',
      serial: 'SMOKE0001',
      speed: 'USB 2.0 @ 480 Mb/s',
      power: '100 mA',
      deviceClass: '00',
    },
    { id: '1-2', name: 'USB device', vendor: '', vendorId: '', productId: '', serial: '', speed: '', power: '', deviceClass: 'e0' },
  ],
})

bus.retain('system.cpu', {
  percent: 37,
  history: [5, 12, 40, 80, 100, 37, 20, 3],
  loadAverage: [0.52, 0.6, 0.58],
})

bus.retain('hypr.monitors', [{ width: 1920, height: 1080 }])
bus.retain('calendar.sources', {
  sources: [{ id: 'cal-smoke', name: 'Smoke', status: 'ok', message: '', eventCount: 2 }],
})
bus.retain('calendar.events', {
  events: [
    { id: 'a', calendarId: 'cal-smoke', title: 'All day', allDay: true, start: Date.now() - 3_600_000, end: Date.now() + 3_600_000 },
    { id: 'b', calendarId: 'cal-smoke', title: 'Timed', allDay: false, start: Date.now(), end: Date.now() + 1_800_000 },
  ],
  updatedAt: Date.now(),
})

// The two widget cards, with the series the medium and large sizes draw —
// their bar arithmetic only runs once there is something to scale.
for (const size of ['small', 'medium', 'large']) {
  bus.retain(`weather.current/smoke.weather.${size}`, {
    place: 'Smoke',
    temperature: 17,
    unit: '°C',
    code: 61,
    description: 'Light rain',
    isDay: true,
    high: 21,
    low: 11,
    hours: [
      { label: 'Now', temperature: 17, code: 61, isDay: true },
      { label: '15', temperature: 18, code: 3, isDay: true },
      { label: '16', temperature: 18, code: 0, isDay: true },
      { label: '17', temperature: 16, code: 95, isDay: false },
    ],
    days: [
      { label: 'Today', code: 61, high: 21, low: 11 },
      { label: 'Tue', code: 0, high: 24, low: 13 },
      // A flat day, which is what the day list's minimum bar width exists for.
      { label: 'Wed', code: 71, high: 15, low: 15 },
      { label: 'Thu', code: 95, high: 19, low: 9 },
    ],
  })
}

bus.retain('airquality.current', {
  index: 42,
  scale: 'european',
  category: 'Fair',
  max: 100,
  place: 'Smoke',
  updatedAt: Date.now(),
  hours: [
    { label: 'Now', index: 42 },
    { label: '15', index: 88 },
    // Zero and over-scale, the two ends the strip clamps.
    { label: '16', index: 0 },
    { label: '17', index: 140 },
  ],
  pollutants: [
    { label: 'PM2.5', value: 8, unit: 'µg/m³', share: 0.53 },
    { label: 'PM10', value: 61, unit: 'µg/m³', share: 1 },
    { label: 'NO₂', value: 1, unit: 'µg/m³', share: 0.04 },
  ],
})
bus.retain('system.volume', { volume: 40, muted: false })
bus.retain('system.brightness', { percent: 60, available: true })
bus.retain('system.battery', { percent: 80, status: 'Discharging' })
bus.retain('media.player', {
  status: 'Playing',
  title: 'Smoke track',
  artist: 'Smoke artist',
  album: '',
  artUrl: '',
  length: 180,
  shuffle: false,
})
bus.retain('network.state', {
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
})
bus.retain('bluetooth.state', {
  available: true,
  powered: true,
  discovering: false,
  adapter: 'smoke',
})
bus.retain('bluetooth.devices', [
  { mac: '00:00:00:00:00:01', name: 'paired', connected: true, paired: true, icon: 'audio-headset' },
])

// Every Control Centre block shows only when its topic has data.
bus.retain('network.wired', { available: true, connected: true, device: 'eth0', connection: 'Wired' })
bus.retain('system.volume', { volume: 40, muted: false })
bus.retain('system.powerprofile', { active: 'balanced', profiles: ['power-saver', 'balanced', 'performance'] })
bus.retain('quickshare.state', { available: true, visibility: 'invisible', devices: [], transfers: [] })
bus.retain('media.player', { title: 'Smoke Test', artist: 'neoshell', status: 'Playing', artUrl: '' })

// Some surfaces render nothing but an input marker while closed, so the
// gallery's tiles only exist once it is opened. The commands are retained
// rather than published: the views subscribe from an effect, which runs after
// this module does, and only a retained topic replays for a late subscriber.
bus.retain('notch:open', {})
bus.retain('settings:open', { section: 'notch' })
bus.retain('widgets:gallery', { open: true })

GLib.timeout_add(GLib.PRIORITY_DEFAULT, EXIT_AFTER_MS, () => {
  if (!remoteCardShows('Smoke')) {
    print('neoshell: the weather card run as a client did not draw its place')
    System.exit(1)
  }
  print('neoshell: built every view — the tray, the gallery, both widget cards, the notch and settings — without error')
  System.exit(0)
  return GLib.SOURCE_REMOVE
})

// The client's card is only drawn once the runner has started, mounted it and
// had its bus subscription answered, so finding the place in it proves the
// whole path.
function remoteCardShows(text: string): boolean {
  for (const window of Gtk.Window.list_toplevels()) {
    const box = firstWithClass(window as Gtk.Widget, 'smoke-remote')
    if (box !== null && hasLabel(box, text)) {
      return true
    }
  }
  return false
}

function firstWithClass(widget: Gtk.Widget, name: string): Gtk.Widget | null {
  if (widget.has_css_class(name)) {
    return widget
  }
  let child = widget.get_first_child()
  while (child !== null) {
    const found = firstWithClass(child, name)
    if (found !== null) {
      return found
    }
    child = child.get_next_sibling()
  }
  return null
}

function hasLabel(widget: Gtk.Widget, text: string): boolean {
  if (widget instanceof Gtk.Label && widget.get_label() === text) {
    return true
  }
  let child = widget.get_first_child()
  while (child !== null) {
    if (hasLabel(child, text)) {
      return true
    }
    child = child.get_next_sibling()
  }
  return false
}

start(
  Smoke,
  { bus, registry },
  { stylesheet: GLib.build_filenamev([GLib.get_current_dir(), 'style.css']) },
)
