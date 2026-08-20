import { join } from 'node:path'
import type { Context, Plugin } from '@neoshell/kernel'
import type { Bus, BusMessage } from '../bus.js'
import type { HttpService } from './http.js'
import type { SurfacesService, RemoteView } from './surfaces.js'

// viewTreePlugin turns the config view tree into a running desktop:
//
//  - one webview per layer-shell layer that any top-level entry uses; layers
//    nothing uses get no surface (and are destroyed when they empty out)
//  - a top-level entry's args position it inside its layer webview (the
//    surface runtime renders it into an anchored wrapper) and, when it
//    declares an exclusive zone, spawn a contentless reservation surface —
//    the layer webview itself is full-screen and reserves nothing
//  - each layer webview starts fully click-through; the surface runtime
//    reports the occupied rects on surface.<layer>.input and the host
//    forwards them as the wayland input region
//  - the resolved tree is the retained "views" topic surfaces render from
//  - every extension whose view types appear in a layer's subtrees gets its
//    views module mounted into that layer's webview (remote fibers)

export interface ViewTreeConfig {
  extensionsDir: string
}

interface TreeNode {
  id?: string
  type: string
  args?: Record<string, unknown>
  children?: TreeNode[]
}

interface InputRect {
  x: number
  y: number
  w: number
  h: number
}

// RenderHostLike is the optional renderhost service — absent when the render
// host is not owned by this process (tests, migration).
interface RenderHostLike {
  createSurface(spec: Record<string, unknown>): void
  destroy(role: string): void
  setInputRegion(role: string, rects: InputRect[]): void
}

const LAYERS = new Set(['background', 'bottom', 'top', 'overlay'])
const KEYBOARD_RANK: Record<string, number> = { none: 0, ondemand: 1, exclusive: 2 }

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
    children: [
      { type: 'neoshell.volume' },
      { type: 'neoshell.battery' },
      { type: 'neoshell.clock' },
    ],
  },
  {
    id: 'dock',
    type: 'neoshell.dock',
    args: {
      layer: 'top',
      anchors: ['bottom', 'left', 'right'],
      keyboard: 'none',
      height: 76,
      exclusiveEdge: 'bottom',
      exclusiveSize: 76,
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
      const unsubscribeConfig = bus.subscribe('config', (message) => {
        manager.applyFromSnapshot(message.data)
      })
      const unsubscribeInput = bus.subscribe('surface.*', (message) => {
        manager.handleSurfaceMessage(message)
      })
      return async () => {
        unsubscribeConfig()
        unsubscribeInput()
        await manager.teardown()
      }
    })
  },
}

// SurfacePlan is one render-host surface the current tree wants: either a
// layer webview or a contentless exclusive-zone reservation. The signature
// detects spec changes that require a destroy + recreate.
interface SurfacePlan {
  role: string
  signature: string
  spec: Record<string, unknown>
  isWebview: boolean
  blur: boolean
}

class ViewTreeManager {
  private readonly context: Context
  private readonly bus: Bus
  private readonly surfaces: SurfacesService
  private readonly port: number
  private readonly extensionsDir: string
  private readonly createdSurfaces = new Map<string, string>()
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

  handleSurfaceMessage(message: BusMessage): void {
    const layer = inputTopicLayer(message.type)
    if (layer === null || !this.createdSurfaces.has(layer)) {
      return
    }
    const renderHost = this.context.get<RenderHostLike>('renderhost')
    if (renderHost === undefined) {
      return
    }
    renderHost.setInputRegion(layer, inputRectsOf(message.data))
  }

  async teardown(): Promise<void> {
    await this.queue
    for (const [, view] of this.mountedViews) {
      await view.dispose()
    }
    this.mountedViews.clear()
    this.syncSurfaces(new Map())
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

    this.syncSurfaces(planSurfaces(tree, this.port))
    await this.syncViewMounts(tree)
  }

  private syncSurfaces(desired: Map<string, SurfacePlan>): void {
    for (const [role, signature] of [...this.createdSurfaces]) {
      this.destroyIfStale(role, signature, desired)
    }
    for (const plan of desired.values()) {
      this.createIfMissing(plan)
    }
  }

  private destroyIfStale(role: string, signature: string, desired: Map<string, SurfacePlan>): void {
    const plan = desired.get(role)
    if (plan !== undefined && plan.signature === signature) {
      return
    }
    this.createdSurfaces.delete(role)
    const renderHost = this.context.get<RenderHostLike>('renderhost')
    if (renderHost !== undefined) {
      renderHost.destroy(role)
    }
  }

  private createIfMissing(plan: SurfacePlan): void {
    if (this.createdSurfaces.has(plan.role)) {
      return
    }
    this.createdSurfaces.set(plan.role, plan.signature)
    const renderHost = this.context.get<RenderHostLike>('renderhost')
    if (renderHost === undefined) {
      return
    }
    renderHost.createSurface(plan.spec)
    if (plan.isWebview) {
      renderHost.setInputRegion(plan.role, [])
    }
    if (plan.blur) {
      this.applyBlurRules(plan.role)
    }
  }

  private applyBlurRules(role: string): void {
    this.bus.publish('hypr:keyword', { name: 'layerrule', value: `blur,neoshell.${role}` })
    this.bus.publish('hypr:keyword', {
      name: 'layerrule',
      value: `ignorealpha 0.1,neoshell.${role}`,
    })
  }

  // syncViewMounts mounts each referenced extension's views module into each
  // layer webview that uses it, keyed layer:extension, and disposes mounts the
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
    const layer = layerOf(node)
    for (const extensionId of extensionIdsIn(node)) {
      const url = await this.viewsUrlOf(extensionId)
      if (url === null) {
        continue
      }
      desired.set(`${layer}:${extensionId}`, { surfaceId: layer, url })
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

// planSurfaces derives the desired render-host surfaces from the tree: one
// full-screen webview per used layer plus one reservation surface per
// exclusive-zone node.
function planSurfaces(tree: TreeNode[], port: number): Map<string, SurfacePlan> {
  const plans = new Map<string, SurfacePlan>()
  for (const [layer, nodes] of groupByLayer(tree)) {
    addWebviewPlan(plans, layer, nodes, port)
    for (const node of nodes) {
      addReservationPlan(plans, layer, node)
    }
  }
  return plans
}

function addWebviewPlan(
  plans: Map<string, SurfacePlan>,
  layer: string,
  nodes: TreeNode[],
  port: number,
): void {
  const spec: Record<string, unknown> = {
    role: layer,
    url: `http://127.0.0.1:${port}/surface?surface=${layer}`,
    layer,
    anchors: ['top', 'bottom', 'left', 'right'],
    keyboard: maxKeyboard(nodes),
  }
  plans.set(layer, {
    role: layer,
    signature: JSON.stringify(spec),
    spec,
    isWebview: true,
    blur: nodes.some((node) => argsOf(node).blur === true),
  })
}

function addReservationPlan(plans: Map<string, SurfacePlan>, layer: string, node: TreeNode): void {
  const args = argsOf(node)
  const edge = args.exclusiveEdge
  const size = args.exclusiveSize
  if (typeof edge !== 'string' || typeof size !== 'number' || size <= 0) {
    return
  }
  if (node.id === undefined || node.id === '') {
    console.error(`view-tree: exclusive-zone node "${node.type}" has no id, zone skipped`)
    return
  }
  const role = `reserve.${node.id}`
  const spec: Record<string, unknown> = {
    role,
    url: '',
    layer,
    anchors: reservationAnchors(edge),
    keyboard: 'none',
    exclusiveEdge: edge,
    exclusiveSize: size,
  }
  plans.set(role, {
    role,
    signature: JSON.stringify(spec),
    spec,
    isWebview: false,
    blur: false,
  })
}

function reservationAnchors(edge: string): string[] {
  if (edge === 'top' || edge === 'bottom') {
    return [edge, 'left', 'right']
  }
  return [edge, 'top', 'bottom']
}

function groupByLayer(tree: TreeNode[]): Map<string, TreeNode[]> {
  const groups = new Map<string, TreeNode[]>()
  for (const node of tree) {
    const layer = layerOf(node)
    const nodes = groups.get(layer)
    if (nodes === undefined) {
      groups.set(layer, [node])
      continue
    }
    nodes.push(node)
  }
  return groups
}

function layerOf(node: TreeNode): string {
  const layer = argsOf(node).layer
  if (typeof layer === 'string' && LAYERS.has(layer)) {
    return layer
  }
  return 'top'
}

function maxKeyboard(nodes: TreeNode[]): string {
  let best = 'none'
  for (const node of nodes) {
    const keyboard = argsOf(node).keyboard
    if (typeof keyboard !== 'string' || KEYBOARD_RANK[keyboard] === undefined) {
      continue
    }
    if (KEYBOARD_RANK[keyboard] > KEYBOARD_RANK[best]) {
      best = keyboard
    }
  }
  return best
}

function inputTopicLayer(topic: string): string | null {
  const match = /^surface\.([^.]+)\.input$/.exec(topic)
  if (match === null) {
    return null
  }
  return match[1]
}

function inputRectsOf(data: unknown): InputRect[] {
  if (typeof data !== 'object' || data === null) {
    return []
  }
  const rects = (data as { rects?: unknown }).rects
  if (!Array.isArray(rects)) {
    return []
  }
  return rects.filter(isInputRect)
}

function isInputRect(value: unknown): value is InputRect {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const rect = value as InputRect
  return (
    typeof rect.x === 'number' &&
    typeof rect.y === 'number' &&
    typeof rect.w === 'number' &&
    typeof rect.h === 'number'
  )
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
