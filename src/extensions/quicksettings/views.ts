import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'

// quicksettings views: the Control Centre, the menu the bar clock opens, run
// as the quicksettings client (client.ts).

const plugin: Plugin.Object = {
  name: 'quicksettings-views',
  inject: ['ui', 'bus'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('quicksettings.menu', remoteView('quicksettings', 'menu')))
  },
}

export default plugin
