import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'

// aiusage views: the desktop card, registered as aiusage.card (the type the
// widget declaration in the extension registry names), and its Settings page.
// Both run as the aiusage client (client.ts).

const plugin: Plugin.Object = {
  name: 'aiusage-views',
  inject: ['ui', 'bus'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('aiusage.card', remoteView('aiusage', 'card')))
    context.effect(() => ui.register('aiusage.settings', remoteView('aiusage', 'settings')))
  },
}

export default plugin
