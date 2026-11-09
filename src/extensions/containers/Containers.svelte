<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import { recordOf, stringOf } from '../../lib/record'
  import type { ViewProps } from '../../host/plugins/views'
  import { widgetBoxOf } from '../../lib/widget'
  import ContainerRow from './ContainerRow.svelte'
  import ContainersSummary from './ContainersSummary.svelte'
  import { attentionOf, emptyLineOf, engineLineOf, upCountOf } from './display'
  import type { ContainerItem } from './parse'
  import { allEnginesDown, containersStateOf, engineProblemOf } from './topic'
  import type { ContainersState } from './topic'

  // The desktop containers card in the three widget sizes:
  //
  //   small (2x2)   how many are up, a dot per container, what needs attention
  //   medium (4x2)  the same in a column, with the first few containers beside it
  //   large (4x4)   a header, then every container with its usage and, for
  //                 Docker and Podman, restart and stop
  //
  // Containers needing attention sort first. Pods are listed but read-only.

  const CALL_TIMEOUT_MS = 60000
  const ERROR_SHOWN_MS = 6000
  const MEDIUM_ROWS = 3
  const LARGE_ROW_HEIGHT_PX = 46
  const LARGE_FURNITURE_PX = 104

  let { bus, args }: ViewProps = $props()

  let current = $state<ContainersState | null>(null)
  let busyKeys = $state<string[]>([])
  let actionError = $state('')
  let errorTimer: ReturnType<typeof setTimeout> | undefined

  const box = $derived(widgetBoxOf(args))
  const items = $derived(itemsOf(current))
  const largeRows = $derived(Math.max(3, Math.floor((box.height - LARGE_FURNITURE_PX) / LARGE_ROW_HEIGHT_PX)))
  const rowLimit = $derived(rowLimitOf(box.size, largeRows))
  const shownItems = $derived(items.slice(0, rowLimit))
  const hiddenCount = $derived(Math.max(0, items.length - shownItems.length))
  const attention = $derived(attentionOfState(current))
  const footerLine = $derived(footerLineOf(current, actionError))

  $effect(() =>
    subscribeTo(bus, 'containers.state', (message) => {
      current = containersStateOf(message.data)
    }),
  )

  $effect(() => () => clearTimeout(errorTimer))

  function itemsOf(state: ContainersState | null): ContainerItem[] {
    if (state === null) {
      return []
    }
    return state.items
  }

  function rowLimitOf(size: string, large: number): number {
    if (size === 'large') {
      return large
    }
    if (size === 'medium') {
      return MEDIUM_ROWS
    }
    return 0
  }

  function attentionOfState(state: ContainersState | null): { text: string; tone: string } {
    if (state === null) {
      return { text: '', tone: 'neutral' }
    }
    return attentionOf(state.counts)
  }

  function footerLineOf(state: ContainersState | null, failure: string): string {
    if (failure !== '') {
      return failure
    }
    if (state === null) {
      return ''
    }
    return engineLineOf(state.engines)
  }

  function keyOf(item: ContainerItem): string {
    return `${item.engine}:${item.id}`
  }

  function isBusy(item: ContainerItem): boolean {
    return busyKeys.includes(keyOf(item))
  }

  async function act(item: ContainerItem, action: string): Promise<void> {
    const key = keyOf(item)
    busyKeys = [...busyKeys, key]
    const reply = recordOf(
      await bus
        .call('containers:action', { engine: item.engine, id: item.id, action }, CALL_TIMEOUT_MS)
        .catch((error: unknown) => ({ error: String(error) })),
    )
    busyKeys = busyKeys.filter((candidate) => candidate !== key)
    showError(stringOf(reply.error))
  }

  function showError(message: string): void {
    clearTimeout(errorTimer)
    actionError = message
    if (message === '') {
      return
    }
    errorTimer = setTimeout(() => {
      actionError = ''
    }, ERROR_SHOWN_MS)
  }

  function refresh(): void {
    void bus.call('containers:refresh', {}, CALL_TIMEOUT_MS).catch(() => ({}))
  }

  function footerClass(failure: string): string {
    if (failure !== '') {
      return 'card-range container-footer-error'
    }
    return 'card-range'
  }
</script>

{#snippet notice(icon: string, title: string, hint: string)}
  <gtkbox class="container-notice" orientation="vertical" spacing={4} halign="center" valign="center" vexpand>
    <gtkicon {icon} size={26}></gtkicon>
    <gtklabel class="card-title">{title}</gtklabel>
    <gtklabel class="card-hint" wrap justify="center" lines={4} ellipsize="end">{hint}</gtklabel>
  </gtkbox>
{/snippet}

{#snippet rows(full: boolean)}
  <gtkbox orientation="vertical" spacing={2} vexpand>
    {#each shownItems as item (keyOf(item))}
      <ContainerRow {item} {full} busy={isBusy(item)} onaction={act} />
    {/each}
    {#if hiddenCount > 0}
      <gtklabel class="card-range container-more" halign="start">+{hiddenCount} more</gtklabel>
    {/if}
  </gtkbox>
{/snippet}

<gtkbox class="card" orientation="vertical" spacing={10} hexpand vexpand>
  {#if current === null}
    {@render notice('content-loading-symbolic', 'Looking for containers', 'Asking Docker, Podman and kubectl.')}
  {:else if allEnginesDown(current.engines)}
    {@render notice('dialog-warning-symbolic', 'No container engine', engineProblemOf(current.engines))}
  {:else if box.size === 'small'}
    <ContainersSummary counts={current.counts} {items} stacked={true} />
  {:else if box.size === 'medium'}
    <gtkbox orientation="horizontal" spacing={14} vexpand>
      <gtkbox width={140}>
        <ContainersSummary counts={current.counts} {items} stacked={false} />
      </gtkbox>
      {#if items.length === 0}
        <gtkbox hexpand>
          {@render notice('object-select-symbolic', 'All quiet', emptyLineOf(current.counts))}
        </gtkbox>
      {:else}
        <gtkbox orientation="vertical" hexpand valign="center">
          {@render rows(false)}
        </gtkbox>
      {/if}
    </gtkbox>
  {:else}
    <gtkbox orientation="horizontal" spacing={8}>
      <gtkbox orientation="vertical" hexpand>
        <gtklabel class="card-title" halign="start">Containers</gtklabel>
        <gtklabel class="container-attention attention-{attention.tone}" halign="start" ellipsize="end">
          {attention.text}
        </gtklabel>
      </gtkbox>
      <gtklabel class="card-reading container-count" tabular valign="center">{upCountOf(current.counts)}</gtklabel>
      <gtkbutton
        class="card-gear"
        frame={false}
        icon="view-refresh-symbolic"
        tooltip="Refresh"
        valign="start"
        onclicked={refresh}
      ></gtkbutton>
    </gtkbox>
    {#if items.length === 0}
      {@render notice('object-select-symbolic', 'All quiet', emptyLineOf(current.counts))}
    {:else}
      {@render rows(true)}
    {/if}
    <gtklabel class={footerClass(actionError)} halign="start" ellipsize="end" xalign={0}>{footerLine}</gtklabel>
  {/if}
</gtkbox>
