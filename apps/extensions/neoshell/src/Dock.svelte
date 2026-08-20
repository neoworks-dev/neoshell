<script lang="ts">
  import { recordOf } from './lib'
  import type { BusLike } from './lib'

  // The dock: a centered floating panel of launchers. Pinned apps come from
  // the config key dock.pinned (matched against app id or name); without it
  // the first apps from apps:list fill the dock. A dot marks apps with an
  // open window (hypr.windows); clicking one focuses the window instead of
  // launching a second instance.

  interface DockApp {
    id: string
    name: string
    exec: string
    icon: string
    wmClass: string
  }

  const DEFAULT_APP_COUNT = 8

  let { bus }: { bus: BusLike } = $props()

  let apps: DockApp[] = $state([])
  let runningClasses: Set<string> = $state(new Set())
  let pinned: string[] = []

  $effect(() => {
    const unsubscribeWindows = bus.subscribe('hypr.windows', (message) => {
      runningClasses = runningClassesOf(message.data)
    })
    const unsubscribeConfig = bus.subscribe('config', (message) => {
      applyPinned(pinnedOf(message.data))
    })
    void refreshApps()
    return () => {
      unsubscribeWindows()
      unsubscribeConfig()
    }
  })

  function applyPinned(next: string[]): void {
    if (JSON.stringify(next) === JSON.stringify(pinned)) {
      return
    }
    pinned = next
    void refreshApps()
  }

  async function refreshApps(): Promise<void> {
    const reply = await bus.call('apps:list', {})
    if (!Array.isArray(reply)) {
      return
    }
    apps = selectApps(reply.map(dockAppOf), pinned)
  }

  function dockAppOf(raw: unknown): DockApp {
    const record = recordOf(raw)
    const app: DockApp = { id: '', name: '', exec: '', icon: '', wmClass: '' }
    if (typeof record.id === 'string') {
      app.id = record.id
    }
    if (typeof record.name === 'string') {
      app.name = record.name
    }
    if (typeof record.exec === 'string') {
      app.exec = record.exec
    }
    if (typeof record.icon === 'string') {
      app.icon = record.icon
    }
    if (typeof record.wmClass === 'string') {
      app.wmClass = record.wmClass
    }
    return app
  }

  function selectApps(available: DockApp[], wanted: string[]): DockApp[] {
    if (wanted.length === 0) {
      return available.slice(0, DEFAULT_APP_COUNT)
    }
    const selected: DockApp[] = []
    for (const entry of wanted) {
      const app = findApp(available, entry)
      if (app !== null) {
        selected.push(app)
      }
    }
    return selected
  }

  function findApp(available: DockApp[], wanted: string): DockApp | null {
    const needle = wanted.toLowerCase()
    for (const app of available) {
      if (app.id.toLowerCase() === needle || app.name.toLowerCase() === needle) {
        return app
      }
    }
    return null
  }

  function runningClassesOf(data: unknown): Set<string> {
    const classes = new Set<string>()
    if (!Array.isArray(data)) {
      return classes
    }
    for (const raw of data) {
      const value = recordOf(raw).class
      if (typeof value === 'string' && value !== '') {
        classes.add(value.toLowerCase())
      }
    }
    return classes
  }

  function pinnedOf(snapshot: unknown): string[] {
    const dockConfig = recordOf(recordOf(snapshot).dock)
    if (!Array.isArray(dockConfig.pinned)) {
      return []
    }
    return dockConfig.pinned.filter((value) => typeof value === 'string')
  }

  function isRunning(app: DockApp): boolean {
    if (app.wmClass === '') {
      return false
    }
    return runningClasses.has(app.wmClass.toLowerCase())
  }

  function activate(app: DockApp): void {
    if (isRunning(app)) {
      void bus.call('hypr:dispatch', { dispatcher: 'focuswindow', arg: `class:${app.wmClass}` })
      return
    }
    void bus.call('apps:launch', { command: app.exec })
  }

  function iconUrl(app: DockApp): string {
    return `/appicon/${encodeURIComponent(app.icon)}?size=96`
  }
</script>

<div class="flex h-full items-end justify-center pb-2">
  <div
    class="flex items-end gap-1 rounded-2xl border border-base-content/10 bg-base-200/40 px-2 py-1.5"
  >
    {#each apps as app (app.id)}
      <button
        class="relative flex w-13 origin-bottom cursor-pointer flex-col items-center pb-1.5
          transition-transform duration-150 hover:-translate-y-1.5 hover:scale-120"
        title={app.name}
        onclick={() => activate(app)}
      >
        <img class="h-11 w-11 object-contain drop-shadow-md" src={iconUrl(app)} alt={app.name} />
        {#if isRunning(app)}
          <span class="absolute bottom-0 h-1 w-1 rounded-full bg-base-content/80"></span>
        {/if}
      </button>
    {/each}
  </div>
</div>
