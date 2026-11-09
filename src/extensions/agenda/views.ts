import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import AgendaIcon from './AgendaIcon.svelte'
import AgendaMenu from './AgendaMenu.svelte'

// agenda views: the status item's bar icon and the menu it opens.

const plugin: Plugin.Object = {
  name: 'agenda-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('agenda.icon', AgendaIcon))
    context.effect(() => ui.register('agenda.menu', AgendaMenu))
  },
}

export default plugin
