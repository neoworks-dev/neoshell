import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import RunCatIcon from './RunCatIcon.svelte'
import RunCatMenu from './RunCatMenu.svelte'

// runcat views: the status item's bar icon and the menu it opens.

const plugin: Plugin.Object = {
  name: 'runcat-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('runcat.icon', RunCatIcon))
    context.effect(() => ui.register('runcat.menu', RunCatMenu))
  },
}

export default plugin
