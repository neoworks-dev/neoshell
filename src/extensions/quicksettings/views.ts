import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import ControlCentre from './ControlCentre.svelte'
import ControlCentreIcon from './ControlCentreIcon.svelte'

// quicksettings views: the Control Centre status item — its bar icon and the
// menu it opens.

const plugin: Plugin.Object = {
  name: 'quicksettings-views',
  inject: ['ui', 'bus'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('quicksettings.icon', ControlCentreIcon))
    context.effect(() => ui.register('quicksettings.menu', ControlCentre))
  },
}

export default plugin
