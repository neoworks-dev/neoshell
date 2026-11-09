import { describe, expect, test } from 'bun:test'
import { placedCardsOf } from './placed'

describe('placedCardsOf', () => {
  test('lists the weather cards of every screen in layout order', () => {
    const snapshot = {
      widgets: {
        weather: { type: 'weather.card', size: 'medium' },
        github: { type: 'github.contributions', size: 'large' },
        'weather-2': { type: 'weather.card', size: 'large' },
      },
      desktop: { screens: { 'HDMI-A-1': { widgets: { 'weather-3': { type: 'weather.card' } } } } },
    }
    expect(placedCardsOf(snapshot)).toEqual([
      { id: 'weather', size: 'medium' },
      { id: 'weather-2', size: 'large' },
      { id: 'weather-3', size: 'small' },
    ])
  })

  test('a snapshot without a layout has no cards', () => {
    expect(placedCardsOf({})).toEqual([])
    expect(placedCardsOf(null)).toEqual([])
  })
})
