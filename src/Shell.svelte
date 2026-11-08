<script lang="ts">
  import type Gdk from 'gi://Gdk?version=4.0'
  import { untrack } from 'svelte'
  import { subscribeTo } from './lib/bus'
  import { Displays } from './lib/displays.svelte'
  import { DISPLAYS_KEY, connectorsFor, mainConnectorOf, placementOf } from './lib/placement'
  import { Settings } from './lib/settings.svelte'
  import type { Bus } from './host/bus'
  import type { ViewRegistry } from './host/plugins/views'
  import {
    anchorOf,
    exclusiveZoneOf,
    idOf,
    isDetached,
    keyOf,
    keyboardOf,
    layerOf,
    marginOf,
    namespaceOf,
    nodesOf,
    recordOf,
    resolve,
    sizeOf,
  } from './tree'
  import type { TreeNode } from './tree'
  import ViewNode from './ViewNode.svelte'

  // The root of the widget tree: one gtk4-layer-shell window per top-level
  // view-tree node and monitor it is placed on (lib/placement.ts). The tree
  // arrives on the retained "views" topic, so a config edit adds, moves or
  // removes a window without anything here being reloaded.
  //
  // A layer surface cannot change monitors, so a window is keyed by its
  // connector too: moving a surface replaces its window.

  interface SurfaceWindow {
    key: string
    node: TreeNode
    monitor: Gdk.Monitor | null
  }

  let { bus, registry }: { bus: Bus; registry: ViewRegistry } = $props()

  const displays = new Displays()
  const settings = new Settings(untrack(() => bus))

  let nodes = $state<TreeNode[]>([])
  // The registry is a plain object outside Svelte's reactivity. Every
  // registration bumps this, and the nodes re-resolve their type against it —
  // that is what makes a view appear when its extension finishes mounting.
  let generation = $state(0)

  $effect(() =>
    subscribeTo(bus, 'views', (message) => {
      nodes = nodesOf(message.data)
    }),
  )

  $effect(() =>
    registry.onChange(() => {
      generation += 1
    }),
  )

  $effect(() => displays.connect())
  $effect(() => settings.connect())

  // As a string so that config edits elsewhere, which republish the whole
  // snapshot, leave the windows and their args alone.
  const placementJson = $derived(JSON.stringify(recordOf(settings.value(DISPLAYS_KEY))))
  const windows = $derived(windowsOf(nodes, JSON.parse(placementJson), displays.connectors()))

  function windowsOf(list: TreeNode[], section: Record<string, unknown>, connectors: string[]): SurfaceWindow[] {
    const main = mainConnectorOf(section, connectors)
    return list.flatMap((node, index) => windowsForNode(node, keyOf(node, index), section, connectors, main))
  }

  function windowsForNode(
    node: TreeNode,
    key: string,
    section: Record<string, unknown>,
    connectors: string[],
    main: string,
  ): SurfaceWindow[] {
    const args = recordOf(node.args)
    if (isDetached(args)) {
      return [{ key, node, monitor: null }]
    }
    const placement = placementOf(section, idOf(node), args)
    return connectorsFor(placement, connectors, main).map((connector) => ({
      key: `${key}@${connector}`,
      node: placedOn(node, args, connector, main),
      monitor: displays.monitorFor(connector),
    }))
  }

  // The view learns its monitor through args: the desktop sizes itself to it,
  // and only the main display's desktop shows the folder's icons.
  function placedOn(node: TreeNode, args: Record<string, unknown>, connector: string, main: string): TreeNode {
    return { ...node, args: { ...args, monitor: connector, mainMonitor: connector === main } }
  }

  // A window whose type has not been registered yet would be an empty surface
  // the compositor still maps, so the whole window waits for the component.
  function isReady(node: TreeNode, current: number): boolean {
    return resolve(registry, node.type, current) !== undefined
  }
</script>

{#each windows as surface (surface.key)}
  {@const node = surface.node}
  {@const args = recordOf(node.args)}
  {#if !isReady(node, generation)}
    <!-- waits for the component -->
  {:else if isDetached(args)}
    <ViewNode {node} {bus} {registry} {generation} />
  {:else}
    <!-- ui-dark scopes @neoworks/gtk-ui's tokens: shell surfaces are dark
         whatever the system scheme. -->
    <gtkwindow
      class="ui-dark"
      namespace={namespaceOf(node)}
      monitor={surface.monitor}
      layer={layerOf(args)}
      anchor={anchorOf(args)}
      keyboard-mode={keyboardOf(args)}
      exclusive-zone={exclusiveZoneOf(args)}
      gap={marginOf(args)}
      decorated={false}
      default-width={sizeOf(args, 'width')}
      default-height={sizeOf(args, 'height')}
    >
      <!-- The window takes exactly one child and a view renders zero or more
           widgets, so this box is what it is always given. -->
      <gtkbox orientation="vertical">
        <ViewNode {node} {bus} {registry} {generation} />
      </gtkbox>
    </gtkwindow>
  {/if}
{/each}
