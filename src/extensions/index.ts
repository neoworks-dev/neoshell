import type { Plugin } from '@neoworks/extension-system'
import { clientNameParts } from '../host/clients/index.js'
import type { ClientDeclaration } from '../host/clients/index.js'
import hyprBackend from './hypr/backend.js'
import systemBackend from './system/backend.js'
import appsBackend from './apps/backend.js'
import mediaBackend from './media/backend.js'
import calendarBackend from './calendar/backend.js'
import calendarViews from './calendar/views.js'
import agendaViews from './agenda/views.js'
import runcatBackend from './runcat/backend.js'
import runcatViews from './runcat/views.js'
import usbBackend from './usb/backend.js'
import usbViews from './usb/views.js'
import pomodoroBackend from './pomodoro/backend.js'
import pomodoroViews from './pomodoro/views.js'
import quickShareBackend from './quickshare/backend.js'
import filesBackend from './files/backend.js'
import trayBackend from './tray/backend.js'
import dockBackend from './dock/backend.js'
import desktopBackend from './desktop/backend.js'
import networkBackend from './network/backend.js'
import bluetoothBackend from './bluetooth/backend.js'
import weatherBackend from './weather/backend.js'
import airQualityBackend from './airquality/backend.js'
import neoshellViews from './neoshell/views.js'
import lockBackend from './lock/backend.js'
import revealBackend from './reveal/backend.js'
import lockViews from './lock/views.js'
import quicksettingsBackend from './quicksettings/backend.js'
import quicksettingsViews from './quicksettings/views.js'
import settingsViews from './settings/views.js'
import statusViews from './status/views.js'
import weatherViews from './weather/views.js'
import airQualityViews from './airquality/views.js'
import galleryBackend from './gallery/backend.js'
import galleryViews from './gallery/views.js'
import containersBackend from './containers/backend.js'
import containersViews from './containers/views.js'
import aiUsageBackend from './aiusage/backend.js'
import aiUsageViews from './aiusage/views.js'
import emailBackend from './email/backend.js'
import emailViews from './email/views.js'

// The extension registry. In the bun host an extension was a directory the
// loader found by scanning for manifest.json and imported at runtime; one GJS
// process running one bundle has no runtime module loading to do, so the scan
// becomes this table. Everything else about an extension is unchanged: a
// manifest declaring what it needs, a backend half, a view half, either or
// both.

export interface WidgetDeclaration {
  type: string
  name: string
  category: string
  description: string
  sizes: string[]
  defaultSize: string
  // A theme icon name for the gallery's category list.
  icon?: string
  // The installed program a widget comes from; absent for the shell's own.
  source?: string
}

// A tab in the Settings window. The window draws only the tab; everything
// under it is the registered view `view`, so an extension's settings page can
// hold whatever it needs.
export interface SettingsDeclaration {
  id: string
  title: string
  // A theme icon name.
  icon: string
  view: string
  // Lower comes first; ties keep declaration order.
  order?: number
  // Sections with the same group sit together in the sidebar, groups apart.
  group?: string
  // Further words the sidebar's search matches, besides the title.
  keywords?: string[]
}

// A widget the notch's Nook can show. Its width is counted in cells, which
// the user sets per widget within minCells..maxCells.
export interface NotchWidgetDeclaration {
  type: string
  name: string
  // A theme icon name.
  icon: string
  defaultCells: number
  minCells: number
  maxCells: number
}

// An icon in the bar's status area. `icon` is the view drawn in the bar;
// `menu`, when given, is the view a click opens, inside the dropdown box the
// shell draws for every item. Both views get args {monitor}; the menu also
// gets {close}, which dismisses it.
export interface StatusItemDeclaration {
  id: string
  // What the item is, for people (tooltips, settings).
  label: string
  icon: string
  menu?: string
  // Lower sits further left; ties keep declaration order.
  order?: number
  // A retained topic the item waits for: until something publishes it — a
  // battery on a laptop — the item is not shown.
  when?: string
}

export interface ExtensionManifest {
  id: string
  inject?: string[]
  provides?: string[]
  widgets?: WidgetDeclaration[]
  settings?: SettingsDeclaration[]
  notchWidgets?: NotchWidgetDeclaration[]
  statusItems?: StatusItemDeclaration[]
  // Views that run as a client: their bundle is built from the extension's
  // client.ts, and this is everything that client may do on the bus.
  client?: ClientDeclaration
  // An extension with several clients, each built from clients/<name>.ts and
  // run as "<extension>-<name>", so one failing takes only its own views down.
  clients?: Record<string, ClientDeclaration>
}

/** The declaration behind a client name, "weather" or "neoshell-bar". */
export function declaredClient(
  extensions: Record<string, ExtensionModule>,
  name: string,
): ClientDeclaration | undefined {
  const declaration = declarationIn(extensions, name)
  if (declaration === undefined || declaration.permissions.embed === undefined) {
    return declaration
  }
  const embed = declaration.permissions.embed.flatMap((entry) => embedEntriesOf(extensions, entry))
  return { ...declaration, permissions: { ...declaration.permissions, embed } }
}

function declarationIn(
  extensions: Record<string, ExtensionModule>,
  name: string,
): ClientDeclaration | undefined {
  const { extension, part } = clientNameParts(name)
  const found = extensions[extension]
  if (found === undefined) {
    return undefined
  }
  if (part === '') {
    return found.manifest.client
  }
  if (found.manifest.clients === undefined) {
    return undefined
  }
  return found.manifest.clients[part]
}

// An embed permission may name a set every extension adds to instead of
// view types: "@widgets" is every desktop widget's view, "@nook" every Nook
// widget's. One installed later is covered without the client changing.
function embedEntriesOf(extensions: Record<string, ExtensionModule>, entry: string): string[] {
  const manifests = Object.values(extensions).map((extension) => extension.manifest)
  if (entry === '@widgets') {
    return manifests.flatMap((manifest) => typesOf(manifest.widgets))
  }
  if (entry === '@nook') {
    return manifests.flatMap((manifest) => typesOf(manifest.notchWidgets))
  }
  return [entry]
}

function typesOf(declarations: { type: string }[] | undefined): string[] {
  if (declarations === undefined) {
    return []
  }
  return declarations.map((declaration) => declaration.type)
}

export interface ExtensionModule {
  manifest: ExtensionManifest
  backend?: Plugin.Object
  views?: Plugin.Object
}

/** Adds extensions found at startup (host/external), keeping any id already taken. */
export function addExtensions(found: Record<string, ExtensionModule>): void {
  for (const [id, extension] of Object.entries(found)) {
    if (!(id in EXTENSIONS)) {
      EXTENSIONS[id] = extension
    }
  }
}

export const EXTENSIONS: Record<string, ExtensionModule> = {
  hypr: {
    manifest: { id: 'hypr', inject: ['bus'], provides: ['hypr'] },
    backend: hyprBackend as Plugin.Object,
  },
  system: {
    manifest: { id: 'system', inject: ['bus'] },
    backend: systemBackend as Plugin.Object,
  },
  apps: {
    manifest: { id: 'apps', inject: ['bus'] },
    backend: appsBackend as Plugin.Object,
  },
  media: {
    manifest: { id: 'media', inject: ['bus'] },
    backend: mediaBackend as Plugin.Object,
  },
  calendar: {
    manifest: {
      id: 'calendar',
      inject: ['bus', 'ui'],
      settings: [
        {
          id: 'calendar',
          title: 'Calendar',
          icon: 'x-office-calendar-symbolic',
          view: 'calendar.settings',
          order: 20,
          group: 'shell',
          keywords: ['events', 'ics', 'ical', 'google'],
        },
      ],
      // The settings page. Calendar URLs go to the backend, which keeps them
      // in the keyring; the page only ever sees the sources' names and status.
      client: {
        permissions: {
          subscribe: ['calendar.sources'],
          call: ['calendar:add', 'calendar:remove'],
          publish: [],
          configKeys: [],
        },
      },
    },
    backend: calendarBackend as Plugin.Object,
    views: calendarViews,
  },
  quickshare: {
    manifest: { id: 'quickshare', inject: ['bus'] },
    backend: quickShareBackend as Plugin.Object,
  },
  files: {
    manifest: { id: 'files', inject: ['bus'] },
    backend: filesBackend as Plugin.Object,
  },
  tray: {
    manifest: { id: 'tray', inject: ['bus'] },
    backend: trayBackend as Plugin.Object,
  },
  dock: {
    manifest: { id: 'dock', inject: ['bus'] },
    backend: dockBackend as Plugin.Object,
  },
  desktop: {
    manifest: { id: 'desktop', inject: ['bus'] },
    backend: desktopBackend as Plugin.Object,
  },
  reveal: {
    manifest: { id: 'reveal', inject: ['bus'] },
    backend: revealBackend as Plugin.Object,
  },
  network: {
    manifest: { id: 'network', inject: ['bus'] },
    backend: networkBackend as Plugin.Object,
  },
  bluetooth: {
    manifest: { id: 'bluetooth', inject: ['bus'] },
    backend: bluetoothBackend as Plugin.Object,
  },
  neoshell: {
    manifest: {
      id: 'neoshell',
      inject: ['bus', 'ui'],
      settings: [
        {
          id: 'notch',
          title: 'Notch',
          icon: 'view-grid-symbolic',
          view: 'neoshell.notch.settings',
          order: 10,
          group: 'shell',
          keywords: ['widgets', 'nook', 'tray', 'quick share', 'receive', 'trusted'],
        },
      ],
      statusItems: [
        { id: 'battery', label: 'Battery', icon: 'neoshell.battery', order: 70, when: 'system.battery' },
        { id: 'clock', label: 'Date and time', icon: 'neoshell.clock', order: 100 },
      ],
      clients: {
        bar: {
          permissions: {
            subscribe: [
              'hypr.workspaces',
              'hypr.activeworkspace',
              'hypr.windows',
              'hypr.event',
              'status.catalog',
              'status.open',
              'system.battery',
            ],
            // hypr:dispatch also runs commands; the bar only switches workspaces.
            call: [{ type: 'hypr:dispatch', fields: { dispatcher: ['workspace'] } }],
            publish: ['status:toggle'],
            configKeys: [],
            embed: ['*.icon', 'neoshell.clock', 'neoshell.battery'],
          },
        },
        // The notch and the Nook widgets it ships with. The Tray's files are
        // the tray backend's; the client only holds their handles.
        notch: {
          permissions: {
            subscribe: [
              'notch.catalog',
              'notch:open',
              'notch:close',
              'notch:toggle',
              'island:show',
              'island:dismiss',
              'hypr.activewindow',
              'system.volume',
              'media.player',
              'media.artwork',
              'quickshare.state',
              'tray.files',
              'calendar.events',
              'calendar.sources',
            ],
            call: [
              'tray:*',
              'quickshare:discover',
              'quickshare:accept',
              'quickshare:reject',
              'quickshare:cancel',
              'media:playPause',
              'media:next',
              'media:previous',
              'config:set',
            ],
            publish: ['settings:open'],
            configKeys: ['notch.nook', 'notch.openOn', 'quickshare.visibility'],
            embed: ['@nook'],
          },
        },
        // The strip of windows the shown desktop sent away, and the hot corner
        // that shows it.
        reveal: {
          permissions: {
            subscribe: ['reveal.state'],
            call: ['reveal:restore', 'reveal:toggle'],
            publish: [],
            configKeys: [],
          },
        },
        // Launching goes through dock:launch, which only runs what an
        // installed application or dock.apps names.
        dock: {
          permissions: {
            subscribe: ['dock.windows'],
            call: [
              'apps:list',
              'dock:launch',
              'dock:capture',
              { type: 'hypr:dispatch', fields: { dispatcher: ['focuswindow'] } },
            ],
            publish: [],
            configKeys: ['dock.pinned', 'dock.apps'],
          },
        },
        // Files only through desktop:*, which acts on what the desktop shows.
        // The wallpaper and the widgets are the host's views, embedded.
        desktop: {
          permissions: {
            subscribe: ['desktop.entries', 'hypr.monitors', 'widgets:add', 'widgets:gallery', 'widgets:dragging'],
            call: ['desktop:*', 'config:set'],
            publish: ['widgets:gallery'],
            configKeys: ['widgets', 'icons', 'desktop.*'],
            embed: ['neoshell.wallpaper', '@widgets'],
          },
        },
        settings: {
          permissions: {
            subscribe: ['notch.catalog'],
            call: ['config:set'],
            publish: [],
            configKeys: [
              'notch.nook',
              'notch.openOn',
              'quickshare.visibility',
              'quickshare.deviceName',
              'quickshare.trusted',
            ],
          },
        },
        gallery: {
          permissions: {
            subscribe: ['widgets:gallery', 'widgets.catalog', 'hypr.monitors'],
            call: [],
            publish: ['widgets:gallery', 'widgets:add', 'widgets:dragging'],
            configKeys: [],
            embed: ['@widgets'],
          },
        },
      },
      notchWidgets: [
        {
          type: 'neoshell.nook.media',
          name: 'Media Player',
          icon: 'audio-x-generic-symbolic',
          defaultCells: 5,
          minCells: 4,
          maxCells: 8,
        },
        {
          type: 'neoshell.nook.calendar',
          name: 'Calendar',
          icon: 'x-office-calendar-symbolic',
          defaultCells: 5,
          minCells: 4,
          maxCells: 7,
        },
      ],
    },
    views: neoshellViews,
  },
  lock: {
    manifest: { id: 'lock', inject: ['bus', 'ui'] },
    backend: lockBackend as Plugin.Object,
    views: lockViews,
  },
  quicksettings: {
    manifest: {
      id: 'quicksettings',
      inject: ['bus', 'ui'],
      statusItems: [
        { id: 'controls', label: 'Control Centre', icon: 'quicksettings.icon', menu: 'quicksettings.menu', order: 80 },
      ],
      client: {
        permissions: {
          subscribe: [
            'quicksettings.account',
            'network.state',
            'network.networks',
            'network.wired',
            'bluetooth.state',
            'bluetooth.devices',
            'system.volume',
            'system.powerprofile',
            'quickshare.state',
            'media.player',
            'media.artwork',
          ],
          call: [
            'quicksettings:screenshot',
            'system:power',
            'system:setPowerProfile',
            'system:setVolume',
            'system:setMuted',
            'network:*',
            'bluetooth:*',
            'media:playPause',
            'media:next',
            'media:previous',
            'config:set',
          ],
          publish: ['settings:open'],
          configKeys: ['quickshare.visibility'],
        },
      },
    },
    backend: quicksettingsBackend as Plugin.Object,
    views: quicksettingsViews,
  },
  agenda: {
    manifest: {
      id: 'agenda',
      inject: ['bus', 'ui'],
      statusItems: [{ id: 'agenda', label: 'Agenda', icon: 'agenda.icon', menu: 'agenda.menu', order: 40 }],
      client: {
        permissions: { subscribe: ['calendar.events'], call: ['config:set'], publish: [], configKeys: ['agenda.tasks'] },
      },
    },
    views: agendaViews,
  },
  pomodoro: {
    manifest: {
      id: 'pomodoro',
      inject: ['bus', 'ui'],
      statusItems: [{ id: 'pomodoro', label: 'Pomodoro', icon: 'pomodoro.icon', menu: 'pomodoro.menu', order: 20 }],
      client: {
        permissions: { subscribe: ['pomodoro.state'], call: ['pomodoro:*'], publish: [], configKeys: [] },
      },
    },
    backend: pomodoroBackend as Plugin.Object,
    views: pomodoroViews,
  },
  usb: {
    manifest: {
      id: 'usb',
      inject: ['bus', 'ui'],
      statusItems: [{ id: 'usb', label: 'USB devices', icon: 'usb.icon', menu: 'usb.menu', order: 30 }],
      client: {
        permissions: { subscribe: ['usb.devices'], call: [], publish: [], configKeys: [] },
      },
    },
    backend: usbBackend as Plugin.Object,
    views: usbViews,
  },
  runcat: {
    manifest: {
      id: 'runcat',
      inject: ['bus', 'ui'],
      statusItems: [{ id: 'runcat', label: 'CPU', icon: 'runcat.icon', menu: 'runcat.menu', order: 10 }],
      client: {
        permissions: { subscribe: ['system.cpu'], call: [], publish: [], configKeys: [] },
      },
    },
    backend: runcatBackend as Plugin.Object,
    views: runcatViews,
  },
  // The bar's status area and the window its menus open in.
  status: {
    manifest: { id: 'status', inject: ['bus', 'ui'] },
    views: statusViews,
  },
  settings: {
    manifest: {
      id: 'settings',
      inject: ['bus', 'ui'],
      settings: [
        {
          id: 'displays',
          title: 'Displays',
          icon: 'video-display-symbolic',
          view: 'settings.displays',
          order: 0,
          group: 'system',
          keywords: ['monitor', 'screen', 'main display'],
        },
      ],
      client: {
        permissions: {
          subscribe: ['views', 'displays.connected'],
          call: ['config:set'],
          publish: [],
          configKeys: ['displays.*'],
        },
      },
    },
    views: settingsViews,
  },
  // The two widget providers. Their `widgets` declarations are what the
  // gallery lists — read from the manifest rather than from the mount list, so
  // a widget appears in the gallery because its extension is installed, not
  // because it is running.
  weather: {
    manifest: {
      id: 'weather',
      inject: ['bus', 'ui'],
      widgets: [
        {
          type: 'weather.card',
          name: 'Weather',
          category: 'Weather',
          icon: 'weather-few-clouds-symbolic',
          description: 'Current conditions, the next hours, and the coming days.',
          sizes: ['small', 'medium', 'large'],
          defaultSize: 'small',
        },
      ],
      client: {
        permissions: {
          subscribe: ['weather.current/*'],
          call: ['weather:watch', 'config:set'],
          publish: [],
          configKeys: ['weather.cards.*'],
        },
      },
    },
    backend: weatherBackend as Plugin.Object,
    views: weatherViews,
  },
  airquality: {
    manifest: {
      id: 'airquality',
      inject: ['bus', 'ui'],
      widgets: [
        {
          type: 'airquality.card',
          name: 'Air Quality',
          category: 'Weather',
          icon: 'weather-fog-symbolic',
          description: 'The air quality index, the next hours, and the pollutants behind it.',
          sizes: ['small', 'medium', 'large'],
          defaultSize: 'small',
        },
      ],
      client: {
        permissions: { subscribe: ['airquality.current'], call: [], publish: [], configKeys: [] },
      },
    },
    backend: airQualityBackend as Plugin.Object,
    views: airQualityViews,
  },
  // Pictures from a folder. The widget only holds file handles; thumbnails and
  // "open" go through the backend.
  gallery: {
    manifest: {
      id: 'gallery',
      inject: ['bus', 'ui'],
      widgets: [
        {
          type: 'gallery.card',
          name: 'Gallery',
          category: 'Photos',
          icon: 'folder-pictures-symbolic',
          description: 'Pictures from a folder, fading slowly from one to the next.',
          sizes: ['small', 'medium', 'large'],
          defaultSize: 'medium',
        },
      ],
      settings: [
        {
          id: 'gallery',
          title: 'Gallery',
          icon: 'folder-pictures-symbolic',
          view: 'gallery.settings',
          order: 30,
          group: 'shell',
          keywords: ['pictures', 'photos', 'images', 'folder', 'slideshow'],
        },
      ],
      client: {
        permissions: {
          subscribe: ['gallery.library'],
          call: ['gallery:thumbnail', 'gallery:open', 'config:set'],
          publish: ['settings:open'],
          configKeys: ['gallery.*'],
        },
      },
    },
    backend: galleryBackend as Plugin.Object,
    views: galleryViews,
  },
  // Docker and Podman containers and Kubernetes pods, from the engines' own
  // command-line tools.
  containers: {
    manifest: {
      id: 'containers',
      inject: ['bus', 'ui'],
      widgets: [
        {
          type: 'containers.card',
          name: 'Containers',
          category: 'Developer',
          icon: 'package-x-generic-symbolic',
          description: 'Docker and Podman containers and Kubernetes pods, with their health.',
          sizes: ['small', 'medium', 'large'],
          defaultSize: 'medium',
        },
      ],
      settings: [
        {
          id: 'containers',
          title: 'Containers',
          icon: 'package-x-generic-symbolic',
          view: 'containers.settings',
          order: 40,
          group: 'shell',
          keywords: ['docker', 'podman', 'kubernetes', 'kubectl', 'pods'],
        },
      ],
      client: {
        permissions: {
          subscribe: ['containers.state'],
          call: ['containers:action', 'containers:refresh', 'config:set'],
          publish: [],
          configKeys: ['containers.*'],
        },
      },
    },
    backend: containersBackend as Plugin.Object,
    views: containersViews,
  },
  // Coding agents' token use, plan windows and live sessions, read from the
  // logs Claude Code and Codex keep on this machine.
  aiusage: {
    manifest: {
      id: 'aiusage',
      inject: ['bus', 'ui'],
      widgets: [
        {
          type: 'aiusage.card',
          name: 'AI usage',
          category: 'Developer',
          icon: 'utilities-terminal-symbolic',
          description: 'Claude Code and Codex: token use, usage windows and what each is doing now.',
          sizes: ['small', 'medium', 'large'],
          defaultSize: 'medium',
        },
      ],
      settings: [
        {
          id: 'aiusage',
          title: 'AI usage',
          icon: 'utilities-terminal-symbolic',
          view: 'aiusage.settings',
          order: 50,
          group: 'shell',
          keywords: ['claude', 'codex', 'tokens', 'limits', 'agents', 'openai', 'anthropic'],
        },
      ],
      client: {
        permissions: {
          subscribe: ['aiusage.state'],
          call: ['aiusage:refresh', 'config:set'],
          publish: ['settings:open'],
          configKeys: ['aiusage.*'],
        },
      },
    },
    backend: aiUsageBackend as Plugin.Object,
    views: aiUsageViews,
  },
  // Unread mail from IMAP accounts, with the passwords in the keyring.
  email: {
    manifest: {
      id: 'email',
      inject: ['bus', 'ui'],
      widgets: [
        {
          type: 'email.card',
          name: 'Email',
          category: 'Communication',
          icon: 'mail-unread-symbolic',
          description: 'The unread count and the newest unread senders and subjects.',
          sizes: ['small', 'medium', 'large'],
          defaultSize: 'medium',
        },
      ],
      settings: [
        {
          id: 'email',
          title: 'Email',
          icon: 'mail-unread-symbolic',
          view: 'email.settings',
          order: 60,
          group: 'shell',
          keywords: ['mail', 'imap', 'inbox', 'gmail', 'accounts', 'unread'],
        },
      ],
      // The passwords go to the backend, which keeps them in the keyring; the
      // client only ever sees names and statuses.
      client: {
        permissions: {
          subscribe: ['email.inbox'],
          call: ['email:add', 'email:remove', 'email:refresh', 'config:set'],
          publish: ['settings:open'],
          configKeys: ['email.pollMinutes'],
        },
      },
    },
    backend: emailBackend as Plugin.Object,
    views: emailViews,
  },
}
