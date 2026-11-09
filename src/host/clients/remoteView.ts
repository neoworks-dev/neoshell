import type { ViewComponent } from '../plugins/views.js'
import RemoteView from './RemoteView.svelte'

// The component the registry holds for a view that runs as a client: the
// shell renders it like any view, and it hands its place to `client`'s view
// `view`. Svelte passes props as an object of getters, so the two names are
// added through a proxy rather than copied, which would freeze the rest.

export function remoteView(client: string, view: string): ViewComponent {
  const extra: Record<string, string> = { client, view }
  const render = RemoteView as unknown as (anchor: unknown, props: unknown) => unknown
  const component = (anchor: unknown, props: Record<string, unknown>): unknown =>
    render(anchor, withExtra(props, extra))
  return component as unknown as ViewComponent
}

function withExtra(props: Record<string, unknown>, extra: Record<string, string>): Record<string, unknown> {
  return new Proxy(props, {
    get(target, key, receiver) {
      if (typeof key === 'string' && key in extra) {
        return extra[key]
      }
      return Reflect.get(target, key, receiver)
    },
    has(target, key) {
      return (typeof key === 'string' && key in extra) || Reflect.has(target, key)
    },
    getOwnPropertyDescriptor(target, key) {
      if (typeof key === 'string' && key in extra) {
        return { value: extra[key], enumerable: true, configurable: true, writable: false }
      }
      return Reflect.getOwnPropertyDescriptor(target, key)
    },
    ownKeys(target) {
      return [...new Set([...Reflect.ownKeys(target), ...Object.keys(extra)])]
    },
  })
}
