import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../../lib/services.js'
import type { ViewRegistry } from '../../host/plugins/views.js'
import UsbIcon from './UsbIcon.svelte'
import UsbMenu from './UsbMenu.svelte'

// usb views: the status item's bar icon and the menu it opens.

const plugin: Plugin.Object = {
  name: 'usb-views',
  inject: ['ui'],
  apply(context) {
    const ui = requireService<ViewRegistry>(context, 'ui')
    context.effect(() => ui.register('usb.icon', UsbIcon))
    context.effect(() => ui.register('usb.menu', UsbMenu))
  },
}

export default plugin
