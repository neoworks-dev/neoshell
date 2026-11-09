import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'
import Wallpaper from './Wallpaper.svelte'
import NotchSettings from './NotchSettings.svelte'

// neoshell default views — the neoworks profile's surface set. Registration is
// an effect, so a view type leaves the registry with the extension and the
// shell drops the window that was showing it. The bar, the clock and the
// battery run as the neoshell-bar client (clients/bar.ts); the notch and its
// Nook widgets as neoshell-notch (clients/notch.ts), the dock as
// neoshell-dock (clients/dock.ts), the desktop as neoshell-desktop
// (clients/desktop.ts), the widget gallery as neoshell-gallery
// (clients/gallery.ts).

const plugin: Plugin.Object = {
  name: 'neoshell-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('neoshell.topbar', remoteView('neoshell-bar', 'topbar')))
    context.effect(() => ui.register('neoshell.notch', remoteView('neoshell-notch', 'notch')))
    context.effect(() => ui.register('neoshell.clock', remoteView('neoshell-bar', 'clock')))
    context.effect(() => ui.register('neoshell.battery', remoteView('neoshell-bar', 'battery')))
    context.effect(() => ui.register('neoshell.dock', remoteView('neoshell-dock', 'dock')))
    context.effect(() => ui.register('neoshell.wallpaper', Wallpaper))
    context.effect(() => ui.register('neoshell.desktop', remoteView('neoshell-desktop', 'desktop')))
    context.effect(() => ui.register('neoshell.widgetgallery', remoteView('neoshell-gallery', 'gallery')))
    context.effect(() => ui.register('neoshell.notch.settings', NotchSettings))
    context.effect(() => ui.register('neoshell.nook.media', remoteView('neoshell-notch', 'nookMedia')))
    context.effect(() => ui.register('neoshell.nook.calendar', remoteView('neoshell-notch', 'nookCalendar')))
  },
}

export default plugin
