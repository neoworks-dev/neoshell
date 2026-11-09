import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import { remoteView } from '../../host/clients/remoteView.js'
import SettingsWindow from './SettingsWindow.svelte'

// settings views: the unified Settings window, registered as settings.window,
// and the Displays page the shell itself contributes to it. The window is
// the host's, a frame like the status menus' dropdown; every page in it is a
// client's view, the Displays page the settings client's.
// Its tabs come from every manifest's `settings` declarations, so nothing here
// changes when an extension adds a section.

const plugin: Plugin.Object = {
  name: 'settings-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('settings.window', SettingsWindow))
    context.effect(() => ui.register('settings.displays', remoteView('settings', 'displays')))
  },
}

export default plugin
