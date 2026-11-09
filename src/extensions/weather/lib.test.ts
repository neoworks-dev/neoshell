import { describe, expect, test } from 'bun:test'
import { iconToneOf, skyOf } from './lib'

describe('skyOf', () => {
  test('clear and cloudy skies follow day and night', () => {
    expect(skyOf(0, true)).toBe('weather-sky-clear-day')
    expect(skyOf(1, false)).toBe('weather-sky-clear-night')
    expect(skyOf(2, true)).toBe('weather-sky-cloudy-day')
    expect(skyOf(3, false)).toBe('weather-sky-cloudy-night')
  })

  test('weather groups share one sky day and night', () => {
    expect(skyOf(45, true)).toBe('weather-sky-fog')
    expect(skyOf(61, false)).toBe('weather-sky-rain')
    expect(skyOf(81, true)).toBe('weather-sky-rain')
    expect(skyOf(73, true)).toBe('weather-sky-snow')
    expect(skyOf(85, false)).toBe('weather-sky-snow')
    expect(skyOf(95, true)).toBe('weather-sky-storm')
  })
})

describe('iconToneOf', () => {
  test('colours only the daytime sun', () => {
    expect(iconToneOf(0, true)).toBe('weather-sun')
    expect(iconToneOf(0, false)).toBe('')
    expect(iconToneOf(2, true)).toBe('')
  })
})
