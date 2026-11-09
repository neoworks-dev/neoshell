import { recordOf } from '../../lib/record.js'

// The weather cards placed on the desktops, read from the layout the desktop
// keeps in config: the main screen's "widgets" and every other screen's
// "desktop.screens.<connector>.widgets".

export interface PlacedCard {
  id: string
  size: string
}

const CARD_TYPE = 'weather.card'

export function placedCardsOf(snapshot: unknown): PlacedCard[] {
  const root = recordOf(snapshot)
  const screens = recordOf(recordOf(root.desktop).screens)
  const layouts = [root.widgets, ...Object.values(screens).map((screen) => recordOf(screen).widgets)]
  return layouts.flatMap(cardsIn)
}

function cardsIn(layout: unknown): PlacedCard[] {
  return Object.entries(recordOf(layout)).flatMap(([id, value]) => {
    const placement = recordOf(value)
    if (placement.type !== CARD_TYPE) {
      return []
    }
    return [{ id, size: sizeOf(placement.size) }]
  })
}

function sizeOf(value: unknown): string {
  if (typeof value !== 'string') {
    return 'small'
  }
  return value
}
