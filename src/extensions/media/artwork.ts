import type { BusService } from '../../lib/bus.js'
import { RetainedTopics } from '../../lib/bus.js'
import { recordOf, stringOf } from '../../lib/record.js'
import { thumbnailHandle } from '../../host/paintables.js'

// The current track's art as a picture handle, for views that run as clients
// and so cannot decode a file themselves:
//
//   media.artwork   {artUrl, handle}    handle is '' when there is no local art
//
// Decoded once per track, at the size of the largest sleeve that shows it.
// Remote art would have to be downloaded first and is left out.

const SLEEVE_PIXELS = 176

export function followArtwork(bus: BusService): () => void {
  const retained = new RetainedTopics(bus)
  let shownUrl: string | null = null
  const unsubscribe = bus.subscribe('media.player', (message) => {
    const artUrl = stringOf(recordOf(message.data).artUrl)
    if (artUrl === shownUrl) {
      return
    }
    shownUrl = artUrl
    retained.set('media.artwork', { artUrl, handle: handleOf(artUrl) })
  })
  return () => {
    unsubscribe()
    retained.withdrawAll()
  }
}

function handleOf(artUrl: string): string {
  if (!artUrl.startsWith('file://')) {
    return ''
  }
  return thumbnailHandle(decodeURIComponent(artUrl.slice('file://'.length)), SLEEVE_PIXELS)
}
