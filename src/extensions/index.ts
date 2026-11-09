import type { Plugin } from '@neoworks/extension-system'
import hyprBackend from './hypr/backend.js'
import systemBackend from './system/backend.js'
import appsBackend from './apps/backend.js'
import mediaBackend from './media/backend.js'
import calendarBackend from './calendar/backend.js'
import calendarViews from './calendar/views.js'
import quickShareBackend from './quickshare/backend.js'
import filesBackend from './files/backend.js'
import networkBackend from './network/backend.js'
import bluetoothBackend from './bluetooth/backend.js'
import weatherBackend from './weather/backend.js'
import airQualityBackend from './airquality/backend.js'
import neoshellViews from './neoshell/views.js'
import lockBackend from './lock/backend.js'
import lockViews from './lock/views.js'
import quicksettingsViews from './quicksettings/views.js'
import settingsViews from './settings/views.js'
import statusViews from './status/views.js'
import weatherViews from './weather/views.js'
import airQualityViews from './airquality/views.js'

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
}

export interface ExtensionModule {
  manifest: ExtensionManifest
  backend?: Plugin.Object
  views?: Plugin.Object
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
    },
    views: quicksettingsViews,
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
          description: 'Current conditions, the next hours, and the coming days.',
          sizes: ['small', 'medium', 'large'],
          defaultSize: 'small',
        },
      ],
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
          description: 'The air quality index, the next hours, and the pollutants behind it.',
          sizes: ['small', 'medium', 'large'],
          defaultSize: 'small',
        },
      ],
    },
    backend: airQualityBackend as Plugin.Object,
    views: airQualityViews,
  },
}
