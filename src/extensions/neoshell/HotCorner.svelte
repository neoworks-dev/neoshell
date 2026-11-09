<script lang="ts">
  import type { ViewProps } from '../../host/plugins/views'

  // The top-left corner of the screen: pushing the pointer into it shows the
  // desktop, and doing it again brings the windows back. The window is a few
  // pixels on the overlay layer, above the bar; the pointer has to leave it
  // before it counts again.

  const CORNER_PX = 3
  const CALL_TIMEOUT_MS = 5000

  let { bus }: ViewProps = $props()

  function toggle(): void {
    void bus.call('reveal:toggle', { reason: 'corner' }, CALL_TIMEOUT_MS)
  }
</script>

<gtkbox class="hot-corner" width={CORNER_PX} height={CORNER_PX} input onhoverstart={toggle}></gtkbox>
