import { mount, unmount } from 'svelte'
import type { EmbeddedView, Embedder } from '@neoworks/svelte-gtk4/host'
import type { BusService } from '../../lib/bus.js'
import type { ViewRegistry } from '../plugins/views.js'
import EmbeddedViewComponent from './EmbeddedView.svelte'
import { mayEmbed } from './permissions.js'
import type { ClientPermissions } from './permissions.js'

// What fills a client's <gtkembed>: the named view, mounted by the host into
// the box, with the args and id the client gave it. A client may only embed
// the view types its permissions list.

interface EmbedProps {
  args: unknown
  id: string
}

export function shellEmbedder(
  name: string,
  bus: BusService,
  registry: ViewRegistry,
  permissions: ClientPermissions,
): Embedder {
  return {
    embed(anchor, view, props): EmbeddedView | null {
      if (!mayEmbed(permissions, view)) {
        console.warn(`${name}: not permitted to embed ${view}`)
        return null
      }
      return mountEmbedded(anchor, view, props, bus, registry)
    },
  }
}

function mountEmbedded(
  anchor: unknown,
  view: string,
  props: unknown,
  bus: BusService,
  registry: ViewRegistry,
): EmbeddedView {
  const current = $state<EmbedProps>(embedPropsOf(props))
  const component = mount(EmbeddedViewComponent, {
    target: anchor as never,
    props: {
      bus,
      registry,
      type: view,
      get args() {
        return current.args
      },
      get id() {
        return current.id
      },
    },
  })
  return {
    update: (next) => Object.assign(current, embedPropsOf(next)),
    dispose: () => {
      void unmount(component)
    },
  }
}

function embedPropsOf(props: unknown): EmbedProps {
  if (typeof props !== 'object' || props === null) {
    return { args: null, id: '' }
  }
  const record = props as Record<string, unknown>
  return { args: record.args, id: idOf(record.id) }
}

function idOf(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  return value
}
