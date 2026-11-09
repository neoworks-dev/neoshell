<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { DEFAULT_STATE, clockLabel, isIdle, timerStateOf } from './pomodoro'
  import type { TimerState } from './pomodoro'

  // The pomodoro menu: a ruler for the length in minutes, the presets, the
  // time left and the controls. The timer itself lives in the backend, so
  // this view only sends commands and shows pomodoro.state.

  const WIDTH = 300
  const COMMAND_TIMEOUT_MS = 2000
  const MIN_MINUTES = 1
  const MAX_MINUTES = 60
  const PRESET_MINUTES = [5, 10, 25]
  const RULER_MARKS = Array.from({ length: MAX_MINUTES }, (_, index) => index + 1)

  let { bus }: ViewProps = $props()

  let timer = $state<TimerState>(DEFAULT_STATE)

  const idle = $derived(isIdle(timer))
  const minutes = $derived(Math.round(timer.durationSeconds / 60))

  $effect(() => subscribeTo(bus, 'pomodoro.state', (message) => (timer = timerStateOf(message.data))))

  function send(command: string, data: unknown): void {
    void bus.call(command, data, COMMAND_TIMEOUT_MS)
  }

  function handleRuler(event: { target: { widget: { get_value(): number } } }): void {
    const chosen = Math.round(event.target.widget.get_value())
    if (chosen === minutes) {
      return
    }
    send('pomodoro:set', { minutes: chosen })
  }

  function toggleRunning(): void {
    if (timer.running) {
      send('pomodoro:pause', {})
      return
    }
    send('pomodoro:start', {})
  }

  function runLabel(): string {
    if (timer.running) {
      return 'Pause'
    }
    if (idle) {
      return 'Start'
    }
    return 'Resume'
  }

  function presetClass(preset: number, current: number): string {
    if (preset === current) {
      return 'pomo-preset pomo-preset-active'
    }
    return 'pomo-preset'
  }
</script>

<gtkbox class="pomo" orientation="vertical" spacing={12} width={WIDTH}>
  <gtkscale
    class="pomo-ruler"
    orientation="horizontal"
    min={MIN_MINUTES}
    max={MAX_MINUTES}
    step={1}
    value={minutes}
    marks={RULER_MARKS}
    draw-value={false}
    sensitive={idle}
    tooltip="Minutes"
    hexpand
    onvalue-changed={handleRuler}
  ></gtkscale>

  <gtkbox orientation="horizontal" spacing={4}>
    {#each PRESET_MINUTES as preset (preset)}
      <gtkbutton
        class={presetClass(preset, minutes)}
        frame={false}
        sensitive={idle}
        onclicked={() => send('pomodoro:set', { minutes: preset })}
      >
        {preset}m
      </gtkbutton>
    {/each}
    <gtklabel class="cc-subtitle" hexpand halign="end" valign="center" tabular>{minutes} min</gtklabel>
  </gtkbox>

  <gtkbox orientation="horizontal" spacing={10}>
    <gtkbox orientation="horizontal" spacing={6} valign="end">
      <gtkbutton class="pomo-button pomo-button-primary" frame={false} onclicked={toggleRunning}>
        {runLabel()}
      </gtkbutton>
      <gtkbutton class="pomo-button" frame={false} sensitive={!idle} onclicked={() => send('pomodoro:reset', {})}>
        Reset
      </gtkbutton>
    </gtkbox>
    <gtklabel class="pomo-readout" hexpand halign="end" tabular>{clockLabel(timer.remainingSeconds)}</gtklabel>
  </gtkbox>
</gtkbox>
