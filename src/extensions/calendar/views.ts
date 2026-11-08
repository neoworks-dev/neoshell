import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import CalendarSettings from './CalendarSettings.svelte'

// calendar views: its Settings page. The events themselves show in the
// notch's calendar widget, which reads calendar.events.

const plugin: Plugin.Object = {
  name: 'calendar-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('calendar.settings', CalendarSettings))
  },
}

export default plugin
