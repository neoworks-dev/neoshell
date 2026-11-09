<script lang="ts">
  import { untrack } from 'svelte'
  import type { ClientStatus } from '@neoworks/svelte-gtk4/host'
  import type { ViewProps } from '../plugins/views'
  import { clientManager } from './index'

  // A view that runs as a client: an empty box the client's tree is replayed
  // into, and a notice over it while the client is down. The box is the
  // client's whole world; nothing it draws reaches past it.

  let {
    args,
    id,
    client,
    view,
  }: ViewProps & { client: string; view: string } = $props()

  let anchor = $state<unknown>(null)
  let status = $state<ClientStatus>('starting')
  let detail = $state('')
  let mounted: { update(props: Record<string, unknown>): void; unmount(): void } | null = null

  const props = $derived(propsOf(args, id))

  $effect(() => {
    if (anchor === null) {
      return
    }
    const manager = clientManager()
    if (manager === null) {
      status = 'failed'
      detail = 'clients are not running'
      return
    }
    const current = manager.mount(client, view, untrack(() => props), anchor, (next, why) => {
      status = next
      detail = why
    })
    mounted = current
    return () => {
      current.unmount()
      mounted = null
    }
  })

  $effect(() => {
    const next = props
    if (mounted !== null) {
      mounted.update(next)
    }
  })

  // Only what survives JSON reaches a client; a callback in args does not.
  function propsOf(currentArgs: unknown, currentId: string): Record<string, unknown> {
    return { args: plainArgs(currentArgs), id: currentId }
  }

  function plainArgs(value: unknown): unknown {
    if (value === undefined) {
      return null
    }
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return null
    }
  }

  function retry(): void {
    const manager = clientManager()
    if (manager !== null) {
      manager.retry(client)
    }
  }

  function noticeOf(current: ClientStatus): string {
    if (current === 'failed') {
      return 'This widget stopped working.'
    }
    return 'Restarting…'
  }
</script>

<gtkoverlay class="remote-view" hexpand vexpand>
  <gtkbox bind:this={anchor} hexpand vexpand></gtkbox>
  {#if status === 'restarting' || status === 'failed'}
    <gtkbox
      overlay
      class="remote-view-down"
      orientation="vertical"
      spacing={6}
      halign="fill"
      valign="fill"
      tooltip={detail}
    >
      <gtkbox vexpand></gtkbox>
      <gtklabel class="remote-view-notice" wrap justify="center">{noticeOf(status)}</gtklabel>
      {#if status === 'failed'}
        <gtkbutton class="remote-view-retry" halign="center" onclicked={retry}>Try Again</gtkbutton>
      {/if}
      <gtkbox vexpand></gtkbox>
    </gtkbox>
  {/if}
</gtkoverlay>
