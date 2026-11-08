import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import SettingsWindow from './SettingsWindow.svelte'

// settings views: the unified Settings window, registered as settings.window.
// Its tabs come from every manifest's `settings` declarations, so nothing here
// changes when an extension adds a section.

const plugin: Plugin.Object = {
  name: 'settings-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('settings.window', SettingsWindow))
  },
}

export default plugin
