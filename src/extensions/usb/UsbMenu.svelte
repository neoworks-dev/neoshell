<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import { recordOf } from '../../lib/record'
  import type { ViewProps } from '../../host/plugins/views'
  import { detailOf, devicesOf, iconOf, matchingDevices } from './devices'
  import type { UsbDevice } from './sysfs'

  // The USB status item's menu: one row per connected device (usb.devices),
  // with a search field underneath that filters them.

  const WIDTH = 360
  const MAX_LIST_HEIGHT = 420

  let { bus }: ViewProps = $props()

  let devices = $state.raw<UsbDevice[]>([])
  let query = $state('')

  const shown = $derived(matchingDevices(devices, query))

  $effect(() =>
    subscribeTo(bus, 'usb.devices', (message) => {
      devices = devicesOf(recordOf(message.data).devices)
    }),
  )

  function emptyText(total: number): string {
    if (total === 0) {
      return 'No USB devices connected'
    }
    return 'No device matches'
  }
</script>

<gtkbox class="usb" orientation="vertical" spacing={10} width={WIDTH}>
  {#if shown.length === 0}
    <gtklabel class="qs-empty" halign="center">{emptyText(devices.length)}</gtklabel>
  {:else}
    <gtkscrolledwindow hscroll="never" max-content-height={MAX_LIST_HEIGHT} propagate-height>
      <gtkbox orientation="vertical" spacing={0}>
        {#each shown as device, index (device.id)}
          {#if index > 0}
            <gtkseparator class="usb-separator" orientation="horizontal"></gtkseparator>
          {/if}
          {@render row(device)}
        {/each}
      </gtkbox>
    </gtkscrolledwindow>
  {/if}

  <gtksearchentry
    class="usb-search"
    placeholder="Search devices"
    text={query}
    onsearch-changed={(event: { target: { widget: { get_text(): string } } }) => (query = event.target.widget.get_text())}
  ></gtksearchentry>
</gtkbox>

{#snippet row(device: UsbDevice)}
  <gtkbox class="usb-row" orientation="horizontal" spacing={10}>
    <gtkicon class="usb-glyph" icon={iconOf(device)} size={16} valign="start"></gtkicon>
    <gtkbox orientation="vertical" spacing={2} hexpand>
      <gtkbox orientation="horizontal" spacing={6}>
        <gtklabel class="cc-title" halign="start" ellipsize="end">{device.name}</gtklabel>
        {#if device.speed !== ''}
          <gtklabel class="usb-chip" valign="center">{device.speed}</gtklabel>
        {/if}
        {#if device.power !== ''}
          <gtklabel class="usb-chip" valign="center">{device.power}</gtklabel>
        {/if}
      </gtkbox>
      <gtklabel class="cc-subtitle" halign="start" ellipsize="end">{detailOf(device)}</gtklabel>
      {#if device.serial !== ''}
        <gtklabel class="cc-subtitle" halign="start" ellipsize="end">SN {device.serial}</gtklabel>
      {/if}
    </gtkbox>
  </gtkbox>
{/snippet}
