<script lang="ts">
  import FillMeter from '../../lib/FillMeter.svelte'
  import { cpuFractionOf, cpuLabelOf, cpuToneOf, hasUsage, sublineOf } from './display'
  import { toneOf } from './parse'
  import type { ContainerItem } from './parse'

  // One container or pod. It slides open when it first appears, which is also
  // how a container that starts shows up in the list. The full variant of the
  // large card adds the usage meter and the start, stop and restart buttons.
  // Stopping asks a second press: the button turns into "Stop?" for a few
  // seconds, and only a press on that stops it.

  const SLIDE_MS = 260
  const SLIDE_DELAY_MS = 30
  const ARM_MS = 3000
  const METER_WIDTH_PX = 56

  let {
    item,
    full,
    busy,
    onaction,
  }: {
    item: ContainerItem
    full: boolean
    // An action on this container is still running.
    busy: boolean
    onaction: (item: ContainerItem, action: string) => void
  } = $props()

  let shown = $state(false)
  let stopArmed = $state(false)
  let armTimer: ReturnType<typeof setTimeout> | undefined

  const dotClass = $derived(dotClassOf(item, busy))
  const up = $derived(item.state === 'running' || item.state === 'starting' || item.state === 'unhealthy')
  const showsActions = $derived(full && item.controllable)

  $effect(() => {
    const timer = setTimeout(() => {
      shown = true
    }, SLIDE_DELAY_MS)
    return () => {
      clearTimeout(timer)
      clearTimeout(armTimer)
    }
  })

  function dotClassOf(current: ContainerItem, working: boolean): string {
    const classes = ['tone-dot', 'status-dot', `tone-${toneOf(current.state)}`]
    if (current.state === 'starting' || working) {
      classes.push('pulse')
    }
    return classes.join(' ')
  }

  function stopPressed(): void {
    if (!stopArmed) {
      stopArmed = true
      armTimer = setTimeout(() => {
        stopArmed = false
      }, ARM_MS)
      return
    }
    clearTimeout(armTimer)
    stopArmed = false
    onaction(item, 'stop')
  }

  function stopTooltip(armed: boolean): string {
    if (armed) {
      return 'Press again to stop'
    }
    return 'Stop'
  }

  function stopClass(armed: boolean): string {
    if (armed) {
      return 'container-action armed'
    }
    return 'container-action'
  }

  function rowClass(working: boolean): string {
    if (working) {
      return 'container-row working'
    }
    return 'container-row'
  }
</script>

<gtkrevealer reveal={shown} transition="slide-down" duration={SLIDE_MS}>
  <gtkbox class={rowClass(busy)} orientation="horizontal" spacing={10}>
    <gtkbox class={dotClass} valign="center"></gtkbox>
    <gtkbox orientation="vertical" hexpand valign="center">
      <gtklabel class="card-body" halign="start" ellipsize="end" xalign={0}>{item.name}</gtklabel>
      <gtklabel class="card-hint" halign="start" ellipsize="end" xalign={0}>{sublineOf(item)}</gtklabel>
    </gtkbox>
    {#if full && hasUsage(item)}
      <gtkbox orientation="vertical" spacing={2} valign="center" halign="end">
        <gtkbox orientation="horizontal" spacing={6} halign="end">
          <gtklabel class="card-hint" tabular>{item.memory}</gtklabel>
          <gtklabel class="card-hint" tabular>{cpuLabelOf(item)}</gtklabel>
        </gtkbox>
        <FillMeter fraction={cpuFractionOf(item)} width={METER_WIDTH_PX} tone={cpuToneOf(item)} />
      </gtkbox>
    {/if}
    {#if showsActions}
      <gtkbox orientation="horizontal" spacing={2} valign="center">
        {#if up}
          <gtkbutton
            class="container-action"
            frame={false}
            icon="view-refresh-symbolic"
            tooltip="Restart"
            sensitive={!busy}
            onclicked={() => onaction(item, 'restart')}
          ></gtkbutton>
          <gtkbutton
            class={stopClass(stopArmed)}
            frame={false}
            icon="media-playback-stop-symbolic"
            tooltip={stopTooltip(stopArmed)}
            sensitive={!busy}
            onclicked={stopPressed}
          ></gtkbutton>
        {:else}
          <gtkbutton
            class="container-action"
            frame={false}
            icon="media-playback-start-symbolic"
            tooltip="Start"
            sensitive={!busy}
            onclicked={() => onaction(item, 'start')}
          ></gtkbutton>
        {/if}
      </gtkbox>
    {/if}
  </gtkbox>
</gtkrevealer>
