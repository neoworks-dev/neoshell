import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'
import { addFrameSearchPath } from './iconTheme.js'

// runcat views: the status item's bar icon and the menu it opens, both run as
// the runcat client (client.ts). The cat's frames are icons the host's theme
// has to find.

const plugin: Plugin.Object = {
  name: 'runcat-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    addFrameSearchPath()
    context.effect(() => ui.register('runcat.icon', remoteView('runcat', 'icon')))
    context.effect(() => ui.register('runcat.menu', remoteView('runcat', 'menu')))
  },
}

export default plugin
