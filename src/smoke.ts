// The library must be imported before anything that pulls in Svelte's client
// runtime: it installs the DOM globals that runtime reads at module scope.
import { setPaintableResolver, start } from '@neoworks/svelte-gtk4'
import GLib from 'gi://GLib'
import Gtk from 'gi://Gtk?version=4.0'
import System from 'system'
import { Bus } from './host/bus.js'
import { declaredClient, EXTENSIONS } from './extensions/index.js'
import { startClients } from './host/clients/index.js'
import { remoteView } from './host/clients/remoteView.js'
import { paintableOf, thumbnailHandle } from './host/paintables.js'
import { ViewRegistry } from './host/plugins/views.js'
import Smoke from './Smoke.svelte'
import SmokeCard from './SmokeCard.svelte'
import NotchSettings from './extensions/neoshell/NotchSettings.svelte'
import { clientEventDetail, filesOfDrop } from './host/drops.js'
import { registerFile } from './host/fileHandles.js'
import { recordOf } from './lib/record.js'
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
startClients(bus, registry, (name) => declaredClient(EXTENSIONS, name))
setPaintableResolver(paintableOf)

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
// The Nook widgets run in the notch's client, which embeds them back.
registry.register('neoshell.nook.media', remoteView('neoshell-notch', 'nookMedia'))
registry.register('neoshell.nook.calendar', remoteView('neoshell-notch', 'nookCalendar'))
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
// The bar's workspaces and status items: the clock is the bar client's own
// view, embedded back into it through the host.
bus.retain('hypr.workspaces', [{ id: 1, name: 'smoke-one', windows: 1 }, { id: 2, name: '2', windows: 0 }])
bus.retain('status.catalog', { items: [{ id: 'clock', label: 'Date and time', icon: 'neoshell.clock', order: 100 }] })
registry.register('neoshell.clock', remoteView('neoshell-bar', 'clock'))
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
// The account, with a picture handle for an avatar the remote Control Centre
// has to show without reading the file itself.
const SMOKE_AVATAR = GLib.build_filenamev([GLib.get_current_dir(), 'assets', 'runcat', 'runcat-1-symbolic.svg'])
bus.retain('quicksettings.account', {
  realName: 'Smoke Person',
  accountLabel: 'smoke@neoshell',
  avatar: thumbnailHandle(SMOKE_AVATAR, 88),
  canScreenshot: true,
})

// The Tray as its backend publishes it: a file with a picture, and one that
// has gone missing since it was dropped.
const SMOKE_STYLESHEET = GLib.build_filenamev([GLib.get_current_dir(), 'style.css'])
bus.retain('tray.files', {
  files: [
    {
      file: registerFile(SMOKE_STYLESHEET),
      path: SMOKE_STYLESHEET,
      name: 'style.css',
      icon: 'text-x-generic',
      thumbnail: thumbnailHandle(SMOKE_AVATAR, 104),
      missing: false,
    },
    {
      file: registerFile('/nonexistent/neoshell-smoke.txt'),
      path: '/nonexistent/neoshell-smoke.txt',
      name: 'neoshell-smoke.txt',
      icon: 'dialog-question-symbolic',
      thumbnail: '',
      missing: true,
    },
  ],
})

// Some surfaces render nothing but an input marker while closed, so the
// gallery's tiles only exist once it is opened. The commands are retained
// rather than published: the views subscribe from an effect, which runs after
// this module does, and only a retained topic replays for a late subscriber.
bus.retain('notch:open', {})
bus.retain('settings:open', { section: 'notch' })
bus.retain('widgets:gallery', { open: true })

// What a client's ondrop sees is a token, never the paths; the token is what
// leads a backend back to them.
let dropResolved = false
const dropDetail = recordOf(clientEventDetail('drop', { paths: [SMOKE_STYLESHEET], uris: [], image: '', x: 1, y: 2 }))
void filesOfDrop(dropDetail.drop).then((files) => {
  dropResolved = dropDetail.paths === undefined && files.length === 1 && files[0] === SMOKE_STYLESHEET
})

GLib.timeout_add(GLib.PRIORITY_DEFAULT, EXIT_AFTER_MS, () => {
  for (const [box, text] of REMOTE_CARDS) {
    if (!remoteCardShows(box, text)) {
      print(`neoshell: the card in .${box}, run as a client, did not draw "${text}"`)
      System.exit(1)
    }
  }
  if (!remotePictureShows('smoke-remote-controlcentre')) {
    print('neoshell: the Control Centre, run as a client, did not show the avatar handle')
    System.exit(1)
  }
  if (!remotePictureShows('smoke-remote-tray')) {
    print('neoshell: the Tray, run as a client, did not show the thumbnail handle')
    System.exit(1)
  }
  if (!dropResolved) {
    print('neoshell: a drop token did not lead back to the dropped files')
    System.exit(1)
  }
  print('neoshell: built every view — the tray, the gallery, both widget cards, the notch and settings — without error')
  System.exit(0)
  return GLib.SOURCE_REMOVE
})

// A client's card is only drawn once the runner has started, mounted it and
// had its bus subscription answered, so finding the published text in it
// proves the whole path.
const REMOTE_CARDS: [string, string][] = [
  ['smoke-remote-weather', 'Smoke'],
  ['smoke-remote-airquality', 'Fair'],
  ['smoke-remote-runcat', '37%'],
  ['smoke-remote-usb', 'Smoke Keyboard'],
  // Formatted in the client with the host's locale profile, which has to come
  // out as the host's own Intl writes it.
  ['smoke-remote-agenda', new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date())],
  ['smoke-remote-bar', 'smoke-one'],
  ['smoke-remote-controlcentre', 'Smoke Person'],
  // The Nook's media widget: a view of the notch's client, embedded back
  // into the notch through the host.
  ['smoke-remote-notch', 'Smoke Test'],
  ['smoke-remote-tray', 'style.css'],
  ['smoke-remote-bar', new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())],
]

function remoteCardShows(boxClass: string, text: string): boolean {
  for (const window of Gtk.Window.list_toplevels()) {
    const box = firstWithClass(window as Gtk.Widget, boxClass)
    if (box !== null && hasLabel(box, text)) {
      return true
    }
  }
  return false
}

function remotePictureShows(boxClass: string): boolean {
  for (const window of Gtk.Window.list_toplevels()) {
    const box = firstWithClass(window as Gtk.Widget, boxClass)
    if (box !== null && hasPaintedPicture(box)) {
      return true
    }
  }
  return false
}

function hasPaintedPicture(widget: Gtk.Widget): boolean {
  if (widget instanceof Gtk.Picture && widget.get_paintable() !== null) {
    return true
  }
  let child = widget.get_first_child()
  while (child !== null) {
    if (hasPaintedPicture(child)) {
      return true
    }
    child = child.get_next_sibling()
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
