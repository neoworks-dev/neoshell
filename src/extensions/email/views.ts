import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'

// email views: the desktop card, registered as email.card (the type the widget
// declaration in the extension registry names), and its Settings page. Both
// run as the email client (client.ts).

const plugin: Plugin.Object = {
  name: 'email-views',
  inject: ['ui', 'bus'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('email.card', remoteView('email', 'card')))
    context.effect(() => ui.register('email.settings', remoteView('email', 'settings')))
  },
}

export default plugin
