<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { cpuStateOf } from './cpu'
  import { FRAME_COUNT, frameIconName, frameIntervalMs } from './frames'

  // The bar's running cat: it steps through its frames, faster the busier the
  // CPU is (system.cpu). Each step arms the next timeout, so the pace follows
  // the load without a timer to restart.

  // A GtkImage is square, so the 24x16 frames are drawn in a 24px image. It
  // is an overlay child, which the overlay does not measure, so the bar
  // reserves only the frame's 16px height.
  const ICON_WIDTH = 24
  const ICON_HEIGHT = 16

  let { bus }: ViewProps = $props()

  let frame = $state(0)
  let percent = 0

  $effect(() =>
    subscribeTo(bus, 'system.cpu', (message) => {
      percent = cpuStateOf(message.data).percent
    }),
  )

  $effect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const arm = (): void => {
      timer = setTimeout(advance, frameIntervalMs(percent))
    }
    const advance = (): void => {
      frame = (frame + 1) % FRAME_COUNT
      arm()
    }
    arm()
    return () => {
      clearTimeout(timer)
    }
  })
</script>

<gtkoverlay valign="center">
  <gtkbox width={ICON_WIDTH} height={ICON_HEIGHT}></gtkbox>
  <gtkicon overlay class="runcat-cat" icon={frameIconName(frame)} size={ICON_WIDTH} halign="center" valign="center"></gtkicon>
</gtkoverlay>
