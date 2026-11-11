import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'

// pomodoro views: the status item's bar icon, the menu it opens, and its
// Settings page, all run as the pomodoro client (client.ts).

const plugin: Plugin.Object = {
  name: 'pomodoro-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('pomodoro.icon', remoteView('pomodoro', 'icon')))
    context.effect(() => ui.register('pomodoro.menu', remoteView('pomodoro', 'menu')))
    context.effect(() => ui.register('pomodoro.settings', remoteView('pomodoro', 'settings')))
  },
}

export default plugin
