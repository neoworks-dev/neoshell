import { describe, expect, test } from 'bun:test'
import { DEFAULT_SOUND, SILENT, SOUND_OPTIONS, soundIdOf, soundPathOf } from './sounds'

describe('soundIdOf', () => {
  test('keeps a known sound and silence', () => {
    expect(soundIdOf('bell')).toBe('bell')
    expect(soundIdOf(SILENT)).toBe(SILENT)
  })

  test('falls back to the default for unset or unknown values', () => {
    expect(soundIdOf(undefined)).toBe(DEFAULT_SOUND)
    expect(soundIdOf('kazoo')).toBe(DEFAULT_SOUND)
    expect(soundIdOf(3)).toBe(DEFAULT_SOUND)
  })
})

describe('soundPathOf', () => {
  test('names a file of the freedesktop theme', () => {
    expect(soundPathOf('alarm')).toBe('/usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga')
  })

  test('is empty for silence', () => {
    expect(soundPathOf(SILENT)).toBe('')
  })
})

test('every option but None has a file', () => {
  const playable = SOUND_OPTIONS.filter((option) => option.value !== SILENT)
  expect(playable.every((option) => soundPathOf(option.value) !== '')).toBe(true)
})
