import { renderTree } from './renderer.js'
import type { ViewNode } from './renderer.js'
import { SurfaceRuntime } from './runtime.js'

// bootSurface is the entry the host's /surface page runs: read the surface id
// from the URL, start the runtime against the serving host's bus, and keep the
// surface's own top-level node rendered into <body>. Re-renders when the tree
// changes and (debounced) when view registrations arrive — view modules mount
// asynchronously after the tree is already known.

interface TopLevelNode extends ViewNode {
  id?: string
}

export async function bootSurface(): Promise<SurfaceRuntime> {
  const params = new URLSearchParams(window.location.search)
  const surfaceId = params.get('surface')
  if (surfaceId === null || surfaceId === '') {
    throw new Error('surface: missing ?surface= parameter')
  }
  const runtime = new SurfaceRuntime({
    surfaceId,
    busUrl: `ws://${window.location.host}/ws`,
  })
  await runtime.start()
  followViewTree(runtime, surfaceId, document.body)
  return runtime
}

function followViewTree(runtime: SurfaceRuntime, surfaceId: string, container: HTMLElement): void {
  let disposeRendered = () => {}
  let currentNode: ViewNode | null = null
  let rerenderTimer: ReturnType<typeof setTimeout> | null = null

  const rerender = () => {
    disposeRendered()
    disposeRendered = renderCurrent(container, currentNode, runtime)
  }
  const scheduleRerender = () => {
    if (rerenderTimer !== null) {
      return
    }
    rerenderTimer = setTimeout(() => {
      rerenderTimer = null
      rerender()
    }, 16)
  }

  runtime.bus.subscribe('views', (message) => {
    currentNode = findSurfaceNode(message.data, surfaceId)
    rerender()
  })
  runtime.views.onChange(scheduleRerender)
}

function renderCurrent(
  container: HTMLElement,
  node: ViewNode | null,
  runtime: SurfaceRuntime,
): () => void {
  if (node === null) {
    return () => {}
  }
  return renderTree(container, [node], runtime.views)
}

// findSurfaceNode picks this surface's top-level entry out of the published
// tree. The entry is both the webview (its args hold the surface spec, which
// only the host reads) and the root view rendered here.
export function findSurfaceNode(tree: unknown, surfaceId: string): ViewNode | null {
  if (!Array.isArray(tree)) {
    return null
  }
  for (const candidate of tree as TopLevelNode[]) {
    if (candidate !== null && typeof candidate === 'object' && candidate.id === surfaceId) {
      return candidate
    }
  }
  return null
}
