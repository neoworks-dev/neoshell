import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'

// github views: the three desktop cards (github.contributions, github.repos,
// github.issues — the types the widget declarations name) and the Settings
// page, all run as the github client (client.ts).

const plugin: Plugin.Object = {
  name: 'github-views',
  inject: ['ui', 'bus'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('github.contributions', remoteView('github', 'contributions')))
    context.effect(() => ui.register('github.repos', remoteView('github', 'repos')))
    context.effect(() => ui.register('github.issues', remoteView('github', 'issues')))
    context.effect(() => ui.register('github.settings', remoteView('github', 'settings')))
  },
}

export default plugin
