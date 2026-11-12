import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'

// quickshare views: its Settings page, run as the quickshare client
// (client.ts).

const plugin: Plugin.Object = {
  name: 'quickshare-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('quickshare.settings', remoteView('quickshare', 'settings')))
  },
}

export default plugin
