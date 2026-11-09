import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import StatusMenus from './StatusMenus.svelte'

// status views: the menu host, the window every status item's menu opens in.
// The icons are drawn by the bar (StatusArea), which owns their row.

const plugin: Plugin.Object = {
  name: 'status-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('status.menus', StatusMenus))
  },
}

export default plugin
