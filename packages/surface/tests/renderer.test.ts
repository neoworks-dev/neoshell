import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { describe, expect, test } from 'bun:test'
import { renderTree } from '../src/renderer.js'
import type { ViewNode } from '../src/renderer.js'
import { ViewRegistry } from '../src/viewRegistry.js'

GlobalRegistrator.register()

function makeRegistry(events: string[]): ViewRegistry {
  const registry = new ViewRegistry()
  registry.register('demo.box', (element, args) => {
    element.textContent = String(args)
    events.push(`mount ${String(args)}`)
    return {
      dispose() {
        events.push(`dispose ${String(args)}`)
      },
    }
  })
  registry.register('demo.frame', (element) => {
    const inner = element.ownerDocument.createElement('section')
    element.appendChild(inner)
    events.push('mount frame')
    return {
      dispose() {
        events.push('dispose frame')
      },
      childrenHost: inner,
    }
  })
  return registry
}

describe('view registry', () => {
  test('duplicate registration throws, disposer frees the name', () => {
    const registry = new ViewRegistry()
    const unregister = registry.register('x', () => ({ dispose() {} }))
    expect(() => registry.register('x', () => ({ dispose() {} }))).toThrow('already registered')

    unregister()
    expect(() => registry.register('x', () => ({ dispose() {} }))).not.toThrow()
  })
})

describe('view tree renderer', () => {
  test('renders nested nodes into the declared children host', () => {
    const events: string[] = []
    const registry = makeRegistry(events)
    const container = document.createElement('div')
    const tree: ViewNode[] = [
      {
        type: 'demo.frame',
        children: [
          { type: 'demo.box', args: 'a' },
          { type: 'demo.box', args: 'b' },
        ],
      },
    ]

    const dispose = renderTree(container, tree, registry)

    const frame = container.querySelector('[data-view="demo.frame"]') as HTMLElement
    const section = frame.querySelector('section') as HTMLElement
    expect(section.querySelectorAll('[data-view="demo.box"]')).toHaveLength(2)
    expect(events).toEqual(['mount frame', 'mount a', 'mount b'])

    dispose()
    expect(container.childNodes).toHaveLength(0)
    expect(events.slice(3)).toEqual(['dispose b', 'dispose a', 'dispose frame'])
  })

  test('an unknown view type is skipped without breaking siblings', () => {
    const events: string[] = []
    const registry = makeRegistry(events)
    const container = document.createElement('div')

    const dispose = renderTree(
      container,
      [{ type: 'missing.view' }, { type: 'demo.box', args: 'ok' }],
      registry,
    )

    expect(events).toEqual(['mount ok'])
    expect(container.querySelectorAll('[data-view]')).toHaveLength(1)
    dispose()
  })
})
