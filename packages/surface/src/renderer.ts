import type { ViewInstance, ViewRegistry } from './viewRegistry.js'

// ViewNode is one entry of the config view tree. type resolves against the
// registry; args are static configuration — live data comes from the view
// subscribing to the bus itself.
export interface ViewNode {
  type: string
  args?: unknown
  children?: ViewNode[]
}

// renderTree renders nodes into container and returns a disposer that removes
// everything again, children before parents.
export function renderTree(
  container: HTMLElement,
  nodes: ViewNode[],
  registry: ViewRegistry,
): () => void {
  const disposers = nodes.map((node) => renderNode(container, node, registry))
  return () => {
    for (const dispose of disposers.reverse()) {
      dispose()
    }
  }
}

function renderNode(container: HTMLElement, node: ViewNode, registry: ViewRegistry): () => void {
  const factory = registry.resolve(node.type)
  if (factory === undefined) {
    console.error(`surface: unknown view type "${node.type}"`)
    return () => {}
  }
  const element = document.createElement('div')
  element.dataset.view = node.type
  container.appendChild(element)
  const instance = factory(element, node.args)
  const disposeChildren = renderChildren(element, node, instance, registry)
  return () => {
    disposeChildren()
    instance.dispose()
    element.remove()
  }
}

function renderChildren(
  element: HTMLElement,
  node: ViewNode,
  instance: ViewInstance,
  registry: ViewRegistry,
): () => void {
  if (node.children === undefined || node.children.length === 0) {
    return () => {}
  }
  let host = element
  if (instance.childrenHost !== undefined) {
    host = instance.childrenHost
  }
  return renderTree(host, node.children, registry)
}
