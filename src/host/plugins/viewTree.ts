import type { Plugin } from '@neoworks/extension-system'
import { requireService } from '../services.js'
import type { Bus } from '../bus.js'

// viewTreePlugin turns the config view tree into the retained "views" topic
// the shell renders from, and asks the compositor for the blur the nodes that
// want it need.
//
// One top-level node is one gtk4-layer-shell window. That is the whole change
// from the webview build, and it deletes most of what used to live here: there
// is no full-screen webview per layer to plan, no contentless surface to
// reserve an exclusive zone with, no input region to collect from the far end
// of a socket, and no module URL to mount across a process boundary. A node's
// args are read directly as layer-shell window attributes:
//
//   layer          background | bottom | top | overlay
//   anchors        edges the window sticks to; unanchored axes centre it
//   keyboard       none | ondemand | exclusive
//   width, height  the window's content size on the unanchored axes
//   exclusiveSize  space the compositor keeps clear for it
//   margin         gap between the window and the edges it anchors to
//   blur           ask Hyprland for a layer blur rule
//   blurIgnoreAlpha  pixels at or under this alpha are not blurred (0.1)
//   monitors       "all" or "main" (the default): where the window goes unless
//                  config's displays.surfaces.<id> says otherwise
//   label          what Settings → Displays calls the surface
//
// Everything else in args stays what it always was: static configuration the
// view itself reads.

interface TreeNode {
  id?: string
  type: string
  args?: Record<string, unknown>
  children?: TreeNode[]
}

// The neoworks default profile. Ordinary config — a user's "views" key
// replaces it wholesale.
const DEFAULT_BLUR_IGNORE_ALPHA = 0.1

const DEFAULT_TREE: TreeNode[] = [
  {
    id: 'bar',
    type: 'neoshell.topbar',
    args: {
      label: 'Menu bar',
      layer: 'top',
      anchors: ['top', 'left', 'right'],
      keyboard: 'ondemand',
      // The notch is a window of its own on the same layer, so the bar is only
      // as tall as the bar — the webview build had to make one full-screen
      // surface tall enough for both.
      height: 30,
      exclusiveSize: 30,
      centerGap: 320,
      blur: true,
    },
  },
  {
    id: 'notch',
    type: 'neoshell.notch',
    // Anchored on one edge only, so the compositor centres it horizontally and
    // it takes exactly the width the island asks for.
    args: {
      label: 'Notch',
      layer: 'top',
      anchors: ['top'],
      keyboard: 'none',
    },
  },
  {
    id: 'statusmenus',
    type: 'status.menus',
    // Detached: the window every status item's menu opens in exists only while
    // a menu is open, on the monitor of the bar that opened it. It spans the
    // output so a click anywhere outside the menu can dismiss it.
    args: {
      detached: true,
      layer: 'top',
      anchors: ['top', 'bottom', 'left', 'right'],
      keyboard: 'ondemand',
      offsetTop: 36,
      blur: true,
      // Between the menu box's shadow (≤ 0.6) and its fill (0.72).
      blurIgnoreAlpha: 0.65,
    },
  },
  {
    id: 'dock',
    type: 'neoshell.dock',
    // Edge to edge along the bottom: the hot strip that reveals the dock has to
    // cover the whole edge, and the panel centres itself inside the window.
    args: {
      label: 'Dock',
      layer: 'top',
      anchors: ['bottom', 'left', 'right'],
      keyboard: 'none',
      height: 96,
      blur: true,
    },
  },
  {
    id: 'wallpaper',
    type: 'neoshell.wallpaper',
    // Behind everything, edge to edge. The webview build had no node for this:
    // the wallpaper was a separate daemon painting its own surface, which a GTK
    // picture on the background layer replaces.
    args: {
      label: 'Wallpaper',
      monitors: 'all',
      layer: 'background',
      anchors: ['top', 'bottom', 'left', 'right'],
      keyboard: 'none',
    },
  },
  {
    id: 'desktop',
    type: 'neoshell.desktop',
    // Which widgets the desktop shows is config's answer, under widgets.<id>.
    // This list only seeds a desktop that has never been arranged: once
    // anything is written the seed is never consulted again, so removing a
    // widget in the gallery makes it stay removed.
    args: {
      label: 'Desktop',
      monitors: 'all',
      layer: 'background',
      anchors: ['top', 'bottom', 'left', 'right'],
      // Widgets have their own settings, and a text field on a layer that
      // takes no keyboard focus cannot be typed into.
      keyboard: 'ondemand',
      widgetHost: true,
      widgets: [
        { id: 'weather', type: 'weather.card', size: 'small' },
        { id: 'airquality', type: 'airquality.card', size: 'small' },
      ],
    },
  },
  {
    id: 'lock',
    type: 'lock.screen',
    // Detached: the lock screen's windows are session-lock surfaces, one per
    // monitor, created while the session is locked and destroyed with the
    // lock — not a layer-shell window the shell could keep around.
    args: { detached: true },
  },
  {
    id: 'settings',
    type: 'settings.window',
    // Detached: a regular application window, created on settings:open and
    // destroyed on close, not a layer surface kept mapped.
    args: { detached: true },
  },
  {
    id: 'widgetgallery',
    type: 'neoshell.widgetgallery',
    args: {
      label: 'Widget gallery',
      layer: 'top',
      anchors: ['bottom'],
      keyboard: 'ondemand',
      widgetHost: true,
    },
  },
]

export const viewTreePlugin: Plugin.Object = {
  name: 'view-tree',
  inject: ['bus', 'config'],
  apply(context) {
    const bus = requireService<Bus>(context, 'bus')
    const publisher = new ViewTreePublisher(bus)
    context.effect(() =>
      bus.subscribe('config', (message) => {
        publisher.apply(message.data)
      }),
    )
    context.effect(() => () => publisher.withdraw())
  },
}

class ViewTreePublisher {
  private readonly bus: Bus
  private clearViews: () => void = () => {}
  private clearRules: () => void = () => {}
  private lastSignature = ''

  constructor(bus: Bus) {
    this.bus = bus
  }

  apply(snapshot: unknown): void {
    const tree = treeOf(snapshot)
    const signature = JSON.stringify(tree)
    if (signature === this.lastSignature) {
      return
    }
    this.lastSignature = signature
    this.clearViews()
    this.clearViews = this.bus.retain('views', tree)
    this.clearRules()
    this.clearRules = this.bus.retain('hypr.layerrules', { rules: blurRulesOf(tree) })
  }

  withdraw(): void {
    this.clearViews()
    this.clearRules()
    this.clearViews = () => {}
    this.clearRules = () => {}
    this.lastSignature = ''
  }
}

// The compositor blurs by layer namespace, and the shell names each window
// "neoshell.<node id>" — so asking for blur is a layer rule per node. They are
// retained, not sent: the compositor bridge may mount later, and applies them
// again whenever the compositor reloads its config and drops them.
function blurRulesOf(tree: TreeNode[]): Record<string, unknown>[] {
  return tree
    .filter((node) => argsOf(node).blur === true && node.id !== undefined)
    .map((node) => ({
      namespace: `neoshell.${node.id}`,
      blur: true,
      blurPopups: true,
      ignoreAlpha: ignoreAlphaOf(argsOf(node)),
    }))
}

// Pixels at or under this alpha are not blurred behind. A surface with a drop
// shadow sets it above the shadow's alpha, or the blur spreads under the
// shadow and past the panel's edge.
function ignoreAlphaOf(args: Record<string, unknown>): number {
  if (typeof args.blurIgnoreAlpha === 'number') {
    return args.blurIgnoreAlpha
  }
  return DEFAULT_BLUR_IGNORE_ALPHA
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
