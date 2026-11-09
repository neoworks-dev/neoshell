<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { HISTORY_LENGTH, IDLE_CPU, cpuStateOf } from './cpu'
  import type { CpuState } from './cpu'

  // The running cat's menu: the CPU usage now, the last minute of it as bars,
  // and the load averages (all from system.cpu).

  const WIDTH = 260
  const CHART_HEIGHT = 44
  // Of each sample's slot, the share its bar fills; the rest is the gap.
  const BAR_SHARE = 0.75
  // The shortest bar, in percent of the chart's height, so an idle sample shows.
  const MIN_BAR_PERCENT = 2
  const BAR_ALPHA = 0.55
  const LOAD_LABELS = ['1 min', '5 min', '15 min']
  // One unit per sample across, percent up.
  const VIEWBOX = [0, 0, HISTORY_LENGTH, 100]

  let { bus }: ViewProps = $props()

  let cpu = $state.raw<CpuState>(IDLE_CPU)

  const chart = $derived(chartOf(cpu.history))

  $effect(() => subscribeTo(bus, 'system.cpu', (message) => (cpu = cpuStateOf(message.data))))

  // Newest sample at the right edge; a short history leaves the left empty.
  function chartOf(history: number[]): unknown[][] {
    const offset = HISTORY_LENGTH - history.length
    const bars = history.map((percent, index) => {
      const barHeight = Math.max(MIN_BAR_PERCENT, percent)
      return ['rect', offset + index, 100 - barHeight, BAR_SHARE, barHeight]
    })
    return [['rgba', 0.98, 0.98, 0.98, BAR_ALPHA], ...bars, ['fill']]
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
    <gtkcanvas class="runcat-chart" viewbox={VIEWBOX} commands={chart} content-height={CHART_HEIGHT} hexpand></gtkcanvas>
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
