import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'

// gallery views: the desktop card, registered as gallery.card (the type the
// widget declaration in the extension registry names), and its Settings page.
// Both run as the gallery client (client.ts).

const plugin: Plugin.Object = {
  name: 'gallery-views',
  inject: ['ui', 'bus'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('gallery.card', remoteView('gallery', 'card')))
    context.effect(() => ui.register('gallery.settings', remoteView('gallery', 'settings')))
  },
}

export default plugin
