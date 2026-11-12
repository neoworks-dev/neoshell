import { describe, expect, test } from 'bun:test'
import { logicalMonitorSizeOf, monitorSizeOf, namesMonitor } from './placement'

const MONITORS = [
  { name: 'HDMI-A-1', width: 2560, height: 1600, scale: 1.3333334, transform: 0 },
  { name: 'DP-2', width: 3440, height: 1440, scale: 1, transform: 1 },
]

describe('logicalMonitorSizeOf', () => {
  test('divides a scaled monitor by its scale', () => {
    expect(logicalMonitorSizeOf(MONITORS, 'HDMI-A-1')).toEqual({ width: 1920, height: 1200 })
  })

  test('turns a rotated monitor on its side', () => {
    expect(logicalMonitorSizeOf(MONITORS, 'DP-2')).toEqual({ width: 1440, height: 3440 })
  })

  test('leaves the physical size to monitorSizeOf', () => {
    expect(monitorSizeOf(MONITORS, 'HDMI-A-1')).toEqual({ width: 2560, height: 1600 })
  })
})

describe('namesMonitor', () => {
  test('a listed connector names its monitor', () => {
    expect(namesMonitor(MONITORS, 'DP-2')).toBe(true)
  })

  test('no connector is a guess among several monitors', () => {
    expect(namesMonitor(MONITORS, '')).toBe(false)
  })

  test('no connector names the only monitor there is', () => {
    expect(namesMonitor([MONITORS[0]], '')).toBe(true)
  })
})
