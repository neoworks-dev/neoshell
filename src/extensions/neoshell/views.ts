import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'
import Wallpaper from './Wallpaper.svelte'

// neoshell default views — the neoworks profile's surface set. Registration is
// an effect, so a view type leaves the registry with the extension and the
// shell drops the window that was showing it. Every view but the wallpaper
// runs as a client, one per file in clients/: neoshell-bar (the bar, clock
// and battery), neoshell-notch (the notch and its Nook widgets),
// neoshell-dock, neoshell-desktop, neoshell-gallery, neoshell-settings
// (Settings → Notch) and neoshell-reveal (the hot corner and the strip of
// windows a shown desktop sent away). The wallpaper decodes images and plays video, so it is
// the host's, and the desktop embeds it.

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
    context.effect(() => ui.register('neoshell.notch.settings', remoteView('neoshell-settings', 'notch')))
    context.effect(() => ui.register('neoshell.nook.media', remoteView('neoshell-notch', 'nookMedia')))
    context.effect(() => ui.register('neoshell.nook.calendar', remoteView('neoshell-notch', 'nookCalendar')))
    context.effect(() => ui.register('neoshell.revealstrip', remoteView('neoshell-reveal', 'strip')))
    context.effect(() => ui.register('neoshell.hotcorner', remoteView('neoshell-reveal', 'corner')))
  },
}

export default plugin
