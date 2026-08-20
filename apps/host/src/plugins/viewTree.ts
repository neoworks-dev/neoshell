import { join } from 'node:path'
import type { Context, Plugin } from '@neoshell/kernel'
import type { Bus } from '../bus.js'
import type { HttpService } from './http.js'
import type { SurfacesService, RemoteView } from './surfaces.js'

// viewTreePlugin turns the config view tree into a running desktop:
//
//  - each top-level entry is a webview: its args carry the layer-shell spec,
//    passed to the render host (when running); the entry itself is the root
//    view the surface renders
//  - the resolved tree is the retained "views" topic surfaces render from
//  - every extension whose view types appear in a surface's subtree gets its
//    views module mounted into that surface (remote fibers)
//
// Exclusive zones currently ride on their own top-level entries (bar and dock
// as separate webviews): the render host cannot yet create contentless
// reservation surfaces, so collapsing the top layer into one webview waits on
// that. The tree keeps the cost visible either way.

export interface ViewTreeConfig {
  extensionsDir: string
}

interface TreeNode {
  id?: string
  type: string
  args?: Record<string, unknown>
  children?: TreeNode[]
}

// RenderHostLike is the optional renderhost service — absent when the render
// host is not owned by this process (tests, migration).
interface RenderHostLike {
  createSurface(spec: Record<string, unknown>): void
  destroy(role: string): void
}

// The neoworks default profile: bar, dock, wallpaper. Ordinary config — a
// user's "views" key replaces it wholesale.
const DEFAULT_TREE: TreeNode[] = [
  {
    id: 'bar',
    type: 'neoshell.topbar',
    args: {
      layer: 'top',
      anchors: ['top', 'left', 'right'],
      keyboard: 'ondemand',
      height: 36,
      exclusiveEdge: 'top',
      exclusiveSize: 36,
      blur: true,
    },
    children: [{ type: 'neoshell.clock' }, { type: 'neoshell.battery' }],
  },
  {
    id: 'dock',
    type: 'neoshell.dock',
    args: {
      layer: 'top',
      anchors: ['bottom', 'left', 'right'],
      keyboard: 'none',
      height: 70,
      exclusiveEdge: 'bottom',
      exclusiveSize: 70,
      blur: true,
    },
  },
  {
    id: 'desktop',
    type: 'neoshell.wallpaper',
    args: {
      layer: 'background',
      anchors: ['top', 'bottom', 'left', 'right'],
      keyboard: 'none',
    },
  },
]

export const viewTreePlugin: Plugin<ViewTreeConfig> = {
  name: 'view-tree',
  inject: ['bus', 'config', 'surfaces', 'http'],
  apply(context, config) {
    const bus = context.require<Bus>('bus')
    const http = context.require<HttpService>('http')
    const surfaces = context.require<SurfacesService>('surfaces')
    const manager = new ViewTreeManager(context, bus, surfaces, http.port, config.extensionsDir)
    context.effect(() => {
      const unsubscribe = bus.subscribe('config', (message) => {
        manager.applyFromSnapshot(message.data)
      })
      return async () => {
        unsubscribe()
        await manager.teardown()
      }
    })
  },
}

class ViewTreeManager {
  private readonly context: Context
  private readonly bus: Bus
  private readonly surfaces: SurfacesService
  private readonly port: number
  private readonly extensionsDir: string
  private readonly createdSurfaces = new Set<string>()
  private readonly mountedViews = new Map<string, RemoteView>()
  private clearRetained: () => void = () => {}
  private lastSignature = ''
  private queue: Promise<void> = Promise.resolve()

  constructor(
    context: Context,
    bus: Bus,
    surfaces: SurfacesService,
    port: number,
    extensionsDir: string,
  ) {
    this.context = context
    this.bus = bus
    this.surfaces = surfaces
    this.port = port
    this.extensionsDir = extensionsDir
  }

  applyFromSnapshot(snapshot: unknown): void {
    const tree = treeOf(snapshot)
    this.queue = this.queue.then(() => this.applyTree(tree)).catch(logApplyError)
  }

  settle(): Promise<void> {
    return this.queue
  }

  async teardown(): Promise<void> {
    await this.queue
    for (const [, view] of this.mountedViews) {
      await view.dispose()
    }
    this.mountedViews.clear()
    this.destroyRemovedSurfaces(new Set())
    this.clearRetained()
  }

  private async applyTree(tree: TreeNode[]): Promise<void> {
    const signature = JSON.stringify(tree)
    if (signature === this.lastSignature) {
      return
    }
    this.lastSignature = signature

    this.clearRetained()
    this.clearRetained = this.bus.retain('views', tree)

    const desiredSurfaces = new Set<string>()
    for (const node of tree) {
      this.ensureSurface(node, desiredSurfaces)
    }
    this.destroyRemovedSurfaces(desiredSurfaces)
    await this.syncViewMounts(tree)
  }

  private ensureSurface(node: TreeNode, desired: Set<string>): void {
    if (node.id === undefined || node.id === '') {
      console.error(`view-tree: top-level node "${node.type}" has no id, skipped`)
      return
    }
    desired.add(node.id)
    if (this.createdSurfaces.has(node.id)) {
      return
    }
    this.createdSurfaces.add(node.id)
    this.createWebview(node)
  }

  private createWebview(node: TreeNode): void {
    const renderHost = this.context.get<RenderHostLike>('renderhost')
    if (renderHost === undefined) {
      return
    }
    const args = argsOf(node)
    renderHost.createSurface({
      role: node.id,
      url: `http://127.0.0.1:${this.port}/surface?surface=${node.id}`,
      layer: args.layer,
      anchors: args.anchors,
      keyboard: args.keyboard,
      width: args.width,
      height: args.height,
      exclusiveEdge: args.exclusiveEdge,
      exclusiveSize: args.exclusiveSize,
    })
    if (args.blur === true) {
      this.bus.publish('hypr:keyword', { name: 'layerrule', value: `blur,neoshell.${node.id}` })
      this.bus.publish('hypr:keyword', {
        name: 'layerrule',
        value: `ignorealpha 0.1,neoshell.${node.id}`,
      })
    }
  }

  private destroyRemovedSurfaces(desired: Set<string>): void {
    for (const surfaceId of [...this.createdSurfaces]) {
      if (desired.has(surfaceId)) {
        continue
      }
      this.createdSurfaces.delete(surfaceId)
      const renderHost = this.context.get<RenderHostLike>('renderhost')
      if (renderHost !== undefined) {
        renderHost.destroy(surfaceId)
      }
    }
  }

  // syncViewMounts mounts each referenced extension's views module into each
  // surface that uses it, keyed surface:extension, and disposes mounts the
  // tree no longer needs.
  private async syncViewMounts(tree: TreeNode[]): Promise<void> {
    const desired = new Map<string, { surfaceId: string; url: string }>()
    for (const node of tree) {
      await this.collectMounts(node, desired)
    }
    for (const [key, view] of [...this.mountedViews]) {
      await this.disposeIfUnwanted(key, view, desired)
    }
    for (const [key, mount] of desired) {
      this.mountIfMissing(key, mount)
    }
  }

  private async collectMounts(
    node: TreeNode,
    desired: Map<string, { surfaceId: string; url: string }>,
  ): Promise<void> {
    if (node.id === undefined || node.id === '') {
      return
    }
    for (const extensionId of extensionIdsIn(node)) {
      const url = await this.viewsUrlOf(extensionId)
      if (url === null) {
        continue
      }
      desired.set(`${node.id}:${extensionId}`, { surfaceId: node.id, url })
    }
  }

  private async viewsUrlOf(extensionId: string): Promise<string | null> {
    const manifestPath = join(this.extensionsDir, extensionId, 'manifest.json')
    let manifest: { views?: string }
    try {
      manifest = (await Bun.file(manifestPath).json()) as { views?: string }
    } catch {
      return null
    }
    if (manifest.views === undefined || manifest.views === '') {
      return null
    }
    return `/plugins/${extensionId}/${manifest.views}`
  }

  private async disposeIfUnwanted(
    key: string,
    view: RemoteView,
    desired: Map<string, unknown>,
  ): Promise<void> {
    if (desired.has(key)) {
      return
    }
    await view.dispose()
    this.mountedViews.delete(key)
  }

  private mountIfMissing(key: string, mount: { surfaceId: string; url: string }): void {
    if (this.mountedViews.has(key)) {
      return
    }
    const url = `http://127.0.0.1:${this.port}${mount.url}`
    this.mountedViews.set(key, this.surfaces.mount(mount.surfaceId, { url }))
  }
}

// extensionIdsIn collects the namespace prefixes ("vpn" from "vpn.indicator")
// used anywhere in a node's subtree.
function extensionIdsIn(node: TreeNode): Set<string> {
  const ids = new Set<string>()
  collectExtensionIds(node, ids)
  return ids
}

function collectExtensionIds(node: TreeNode, ids: Set<string>): void {
  const dotIndex = node.type.indexOf('.')
  if (dotIndex > 0) {
    ids.add(node.type.slice(0, dotIndex))
  }
  if (node.children === undefined) {
    return
  }
  for (const child of node.children) {
    collectExtensionIds(child, ids)
  }
}

function treeOf(snapshot: unknown): TreeNode[] {
  if (typeof snapshot !== 'object' || snapshot === null) {
    return DEFAULT_TREE
  }
  const views = (snapshot as Record<string, unknown>).views
  if (!Array.isArray(views)) {
    return DEFAULT_TREE
  }
  return views.filter(isTreeNode)
}

function isTreeNode(value: unknown): value is TreeNode {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return typeof (value as TreeNode).type === 'string'
}

function argsOf(node: TreeNode): Record<string, unknown> {
  if (node.args === undefined) {
    return {}
  }
  return node.args
}

function logApplyError(error: unknown): void {
  console.error('view-tree: apply failed:', error)
}
