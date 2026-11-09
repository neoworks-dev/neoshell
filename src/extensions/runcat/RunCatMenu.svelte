<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { HISTORY_LENGTH, IDLE_CPU, cpuStateOf } from './cpu'
  import type { CpuState } from './cpu'

  // The running cat's menu: the CPU usage now, the last minute of it as bars,
  // and the load averages (all from system.cpu).

  const WIDTH = 260
  const CHART_HEIGHT = 44
  const BAR_GAP = 1
  const BAR_ALPHA = 0.55
  const LOAD_LABELS = ['1 min', '5 min', '15 min']

  // The slice of the cairo context the chart draws with.
  interface Painter {
    setSourceRGBA(red: number, green: number, blue: number, alpha: number): void
    rectangle(x: number, y: number, width: number, height: number): void
    fill(): void
  }

  let { bus }: ViewProps = $props()

  let cpu = $state.raw<CpuState>(IDLE_CPU)

  $effect(() => subscribeTo(bus, 'system.cpu', (message) => (cpu = cpuStateOf(message.data))))

  // Newest sample at the right edge; a short history leaves the left empty.
  function drawHistory(history: number[]): (area: unknown, cr: Painter, width: number, height: number) => void {
    return (_area, cr, width, height) => {
      const slot = width / HISTORY_LENGTH
      const offset = HISTORY_LENGTH - history.length
      cr.setSourceRGBA(0.98, 0.98, 0.98, BAR_ALPHA)
      history.forEach((percent, index) => {
        const barHeight = Math.max(1, (height * percent) / 100)
        cr.rectangle((offset + index) * slot, height - barHeight, slot - BAR_GAP, barHeight)
      })
      cr.fill()
    }
  }

  function loadText(value: number | undefined): string {
    if (value === undefined) {
      return '–'
    }
    return value.toFixed(2)
  }
</script>

<gtkbox class="runcat" orientation="vertical" spacing={10} width={WIDTH}>
  <gtkbox class="cc-block" orientation="vertical" spacing={10}>
    <gtkbox orientation="horizontal">
      <gtkbox orientation="vertical" spacing={0} hexpand valign="center">
        <gtklabel class="cc-title" halign="start">CPU</gtklabel>
        <gtklabel class="cc-subtitle" halign="start">Usage now</gtklabel>
      </gtkbox>
      <gtklabel class="runcat-percent" tabular valign="center">{cpu.percent}%</gtklabel>
    </gtkbox>
    <gtkdrawingarea class="runcat-chart" draw={drawHistory(cpu.history)} content-height={CHART_HEIGHT} hexpand></gtkdrawingarea>
  </gtkbox>

  <gtkbox class="cc-block" orientation="vertical" spacing={6}>
    <gtklabel class="cc-title" halign="start">Load average</gtklabel>
    <gtkbox orientation="horizontal" homogeneous>
      {#each LOAD_LABELS as label, index (label)}
        <gtkbox orientation="vertical" spacing={0}>
          <gtklabel class="runcat-load" halign="start" tabular>{loadText(cpu.loadAverage[index])}</gtklabel>
          <gtklabel class="cc-subtitle" halign="start">{label}</gtklabel>
        </gtkbox>
      {/each}
    </gtkbox>
  </gtkbox>
</gtkbox>
