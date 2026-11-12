<script lang="ts">
  import type { BusService } from '../../lib/bus'
  import { recordOf, stringOf } from '../../lib/record'
  import { fileIconOf, isImageName } from './present'

  // A received file's thumbnail, or its type's icon when it is no picture or
  // the backend will not decode it. The client only ever holds the handle.

  const CALL_TIMEOUT_MS = 5000

  let {
    bus,
    path,
    size,
  }: {
    bus: BusService
    path: string
    // The square's side, in pixels.
    size: number
  } = $props()

  let handle = $state('')

  $effect(() => {
    handle = ''
    if (!isImageName(path)) {
      return
    }
    let current = true
    void requestHandle(path, size).then((answer) => {
      if (current) {
        handle = answer
      }
    })
    return () => {
      current = false
    }
  })

  async function requestHandle(file: string, pixels: number): Promise<string> {
    try {
      const reply = await bus.call('quickshare:thumbnail', { path: file, pixels: pixels * 2 }, CALL_TIMEOUT_MS)
      return stringOf(recordOf(reply).handle)
    } catch (error) {
      console.error('quickshare: no thumbnail:', error)
      return ''
    }
  }

  function nameOf(file: string): string {
    const slash = file.lastIndexOf('/')
    return file.slice(slash + 1)
  }
</script>

<!-- The square is the overlay's main child, so it alone sets the size: a
     picture asks for its image's own size, which an overlay child cannot
     pass on. Nothing inside expands, or the row around it would too. -->
<gtkoverlay class="qs-picture" halign="start" valign="center" clip>
  <gtkbox width={size} height={size}></gtkbox>
  {#if handle !== ''}
    <gtkpicture overlay {handle} fit="cover" shrink></gtkpicture>
  {:else}
    <gtkicon overlay icon={fileIconOf(nameOf(path))} size={Math.round(size / 3)} halign="center" valign="center"></gtkicon>
  {/if}
</gtkoverlay>
