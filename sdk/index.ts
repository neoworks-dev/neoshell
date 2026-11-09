import type { ExtensionSource } from '../src/clients/extension.js'

export { startExtensionClient } from '../src/clients/extension.js'
export type { ExtensionSource } from '../src/clients/extension.js'
export { widgetBoxOf } from '../src/lib/widget.js'
export type { WidgetBox } from '../src/lib/widget.js'

// What a widget view is mounted with. `args` holds its slot (widgetBoxOf
// reads it); `id` is the placed widget's own, stable across restarts.
export interface ExtensionViewProps {
  source: ExtensionSource
  args: unknown
  id: string
}
