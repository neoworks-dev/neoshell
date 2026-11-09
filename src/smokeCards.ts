import type { Bus } from './host/bus.js'

// The smoke's data for the cards of the Containers, AI usage, Email and
// Gallery extensions. Published onto the smoke's own bus, so nothing here
// reaches a real backend. SmokeCards.svelte draws the cards that read it.

/** [css class of the box a client's card sits in, a label it must have drawn]. */
export const SMOKE_CARD_TEXTS: [string, string][] = []

/** [css class of the box, a tooltip it must have drawn]. */
export const SMOKE_CARD_TOOLTIPS: [string, string][] = [['smoke-remote-gallery-card', 'smoke-picture-1.png']]

export function retainSmokeCards(bus: Bus): void {
  retainGallery(bus)
}

function retainGallery(bus: Bus): void {
  bus.retain('gallery.library', {
    folder: '~/Pictures',
    status: 'ok',
    images: Array.from({ length: 12 }, (_, index) => ({
      file: `file:smoke-${index}`,
      name: `smoke-picture-${index + 1}.png`,
    })),
    count: 12,
    intervalSeconds: 6,
    shuffle: false,
    layout: 'mosaic',
    version: 1,
  })
}
