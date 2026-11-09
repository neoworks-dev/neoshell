<script lang="ts">
  import GLib from 'gi://GLib'
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { cpuStateOf } from './cpu'
  import { FRAME_COUNT, addFrameSearchPath, frameIconName, frameIntervalMs } from './frames'

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

  addFrameSearchPath()

  $effect(() =>
    subscribeTo(bus, 'system.cpu', (message) => {
      percent = cpuStateOf(message.data).percent
    }),
  )

  $effect(() => {
    let sourceId = 0
    const arm = (): void => {
      sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, frameIntervalMs(percent), advance)
    }
    const advance = (): boolean => {
      frame = (frame + 1) % FRAME_COUNT
      arm()
      return GLib.SOURCE_REMOVE
    }
    arm()
    return () => {
      GLib.source_remove(sourceId)
    }
  })
</script>

<gtkoverlay valign="center">
  <gtkbox width={ICON_WIDTH} height={ICON_HEIGHT}></gtkbox>
  <gtkicon overlay class="runcat-cat" icon={frameIconName(frame)} size={ICON_WIDTH} halign="center" valign="center"></gtkicon>
</gtkoverlay>
