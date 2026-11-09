import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'

// containers views: the desktop card, registered as containers.card (the type
// the widget declaration in the extension registry names), and its Settings
// page. Both run as the containers client (client.ts).

const plugin: Plugin.Object = {
  name: 'containers-views',
  inject: ['ui', 'bus'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('containers.card', remoteView('containers', 'card')))
    context.effect(() => ui.register('containers.settings', remoteView('containers', 'settings')))
  },
}

export default plugin
