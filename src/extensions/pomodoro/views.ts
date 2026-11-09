import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import PomodoroIcon from './PomodoroIcon.svelte'
import PomodoroMenu from './PomodoroMenu.svelte'

// pomodoro views: the status item's bar icon and the menu it opens.

const plugin: Plugin.Object = {
  name: 'pomodoro-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('pomodoro.icon', PomodoroIcon))
    context.effect(() => ui.register('pomodoro.menu', PomodoroMenu))
  },
}

export default plugin
