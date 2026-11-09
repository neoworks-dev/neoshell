import Embed from './Embed.svelte'

// The registry a client's views get. Every type resolves, to a stand-in that
// embeds the host's view of that type: a client renders no one else's views
// itself, and whether it may show one at all is the host's to decide.

type ViewComponent = (anchor: unknown, props: Record<string, unknown>) => unknown

const standIns = new Map<string, ViewComponent>()

export const clientRegistry = {
  resolve(type: string): ViewComponent {
    const known = standIns.get(type)
    if (known !== undefined) {
      return known
    }
    const created = embedderFor(type)
    standIns.set(type, created)
    return created
  },
  onChange: (): (() => void) => () => {},
  register: (): (() => void) => () => {},
}

// The same component every time for a type, so a re-render keeps the embed.
function embedderFor(type: string): ViewComponent {
  const render = Embed as unknown as (anchor: unknown, props: unknown) => unknown
  return (anchor, props) => render(anchor, withType(props, type))
}

function withType(props: Record<string, unknown>, type: string): Record<string, unknown> {
  return new Proxy(props, {
    get(target, key, receiver) {
      if (key === 'type') {
        return type
      }
      return Reflect.get(target, key, receiver)
    },
    has(target, key) {
      return key === 'type' || Reflect.has(target, key)
    },
  })
}
