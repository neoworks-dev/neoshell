<script lang="ts">
  import type { ExtensionViewProps } from '../../../sdk/index.js'

  let { source }: ExtensionViewProps = $props()

  let text = $state('')
  let available = $state(false)

  $effect(() =>
    source.subscribe('status', (data) => {
      text = String((data as { text?: unknown }).text)
    }),
  )
  $effect(() => source.available((value) => (available = value)))

  function availability(isAvailable: boolean): string {
    if (isAvailable) {
      return 'available'
    }
    return 'gone'
  }
</script>

<gtkbox class="card" orientation="vertical">
  <gtklabel class="card-title">{text}</gtklabel>
  <gtklabel class="card-hint">{availability(available)}</gtklabel>
</gtkbox>
