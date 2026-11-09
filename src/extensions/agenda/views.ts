import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'

// agenda views: the status item's bar icon and the menu it opens, both run as
// the agenda client (client.ts).

const plugin: Plugin.Object = {
  name: 'agenda-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('agenda.icon', remoteView('agenda', 'icon')))
    context.effect(() => ui.register('agenda.menu', remoteView('agenda', 'menu')))
  },
}

export default plugin
