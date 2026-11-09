<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { DEFAULT_STATE, clockLabel, isIdle, timerStateOf } from './pomodoro'
  import type { TimerState } from './pomodoro'

  // The pomodoro's bar icon: a timer glyph while idle, the time left in a
  // small pill while running or paused.

  let { bus }: ViewProps = $props()

  let timer = $state<TimerState>(DEFAULT_STATE)

  const idle = $derived(isIdle(timer))

  $effect(() => subscribeTo(bus, 'pomodoro.state', (message) => (timer = timerStateOf(message.data))))

  function pillClass(running: boolean): string {
    if (running) {
      return 'pomodoro-pill'
    }
    return 'pomodoro-pill pomodoro-pill-paused'
  }
</script>

<!-- The item's button holds one child; swapping that child in place would leave
     it empty, so the swap happens inside a box of its own. -->
<gtkbox orientation="horizontal" valign="center">
  {#if idle}
    <gtkicon icon="alarm-symbolic" size={14} valign="center"></gtkicon>
  {:else}
    <gtkbox class={pillClass(timer.running)} valign="center">
      <gtklabel tabular>{clockLabel(timer.remainingSeconds)}</gtklabel>
    </gtkbox>
  {/if}
</gtkbox>
