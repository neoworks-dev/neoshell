<script lang="ts">
  import { recordOf } from './lib'
  import type { BusLike } from './lib'

  // The top bar: workspaces and the focused window's title on the left; the
  // right side hosts the configured children (volume, battery, clock, …),
  // which the surface renderer mounts into childrenHost.

  interface WorkspaceEntry {
    id: number
    name: string
  }

  let { bus, childrenHost }: { bus: BusLike; childrenHost: HTMLElement } = $props()

  let workspaceList: WorkspaceEntry[] = $state([])
  let activeWorkspaceId = $state(-1)
  let windowTitle = $state('')

  $effect(() => {
    const unsubscribers = [
      bus.subscribe('hypr.workspaces', (message) => {
        workspaceList = workspacesOf(message.data)
      }),
      bus.subscribe('hypr.activeworkspace', (message) => {
        activeWorkspaceId = activeIdOf(message.data)
      }),
      bus.subscribe('hypr.activewindow', (message) => {
        windowTitle = titleOf(message.data)
      }),
    ]
    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
    }
  })

  // Hyprland lists special workspaces with negative ids; the bar shows only
  // the regular ones, in id order.
  function workspacesOf(data: unknown): WorkspaceEntry[] {
    if (!Array.isArray(data)) {
      return []
    }
    const entries: WorkspaceEntry[] = []
    for (const raw of data) {
      const record = recordOf(raw)
      if (typeof record.id === 'number' && record.id > 0) {
        entries.push({ id: record.id, name: workspaceNameOf(record) })
      }
    }
    return entries.sort((a, b) => a.id - b.id)
  }

  function workspaceNameOf(record: Record<string, unknown>): string {
    if (typeof record.name === 'string' && record.name !== '') {
      return record.name
    }
    return String(record.id)
  }

  function activeIdOf(data: unknown): number {
    const id = recordOf(data).id
    if (typeof id === 'number') {
      return id
    }
    return -1
  }

  function titleOf(data: unknown): string {
    const title = recordOf(data).title
    if (typeof title === 'string') {
      return title
    }
    return ''
  }

  function switchWorkspace(id: number): void {
    void bus.call('hypr:dispatch', { dispatcher: 'workspace', arg: String(id) })
  }

  const WORKSPACE_BASE =
    'h-5 min-w-5 cursor-pointer rounded-md px-1.5 text-center text-[11px] leading-5 ' +
    'transition-colors duration-150 '

  function workspaceClass(active: boolean): string {
    if (active) {
      return WORKSPACE_BASE + 'bg-base-content font-semibold text-base-100'
    }
    return WORKSPACE_BASE + 'text-base-content/50 hover:bg-base-content/10 hover:text-base-content'
  }

  function adopt(node: HTMLElement, hosted: HTMLElement): void {
    node.appendChild(hosted)
  }
</script>

<div
  class="flex h-full items-center justify-between gap-6 bg-base-200/40 px-3 text-[13px]
    font-medium text-base-content select-none"
>
  <div class="flex min-w-0 items-center gap-3">
    <div class="flex items-center gap-1">
      {#each workspaceList as workspace (workspace.id)}
        <button
          class={workspaceClass(workspace.id === activeWorkspaceId)}
          onclick={() => switchWorkspace(workspace.id)}
        >
          {workspace.name}
        </button>
      {/each}
    </div>
    <span class="max-w-[48ch] truncate text-base-content/60">{windowTitle}</span>
  </div>
  <div use:adopt={childrenHost}></div>
</div>
