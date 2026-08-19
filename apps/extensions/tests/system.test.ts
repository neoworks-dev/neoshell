import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Kernel } from '@neoshell/kernel'
import systemExtension from '../system/backend.js'
import { busProvider, FakeBus, waitFor } from './helpers.js'

describe('system extension', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'neoshell-system-test-'))
  const batteryDir = join(tempDir, 'power_supply')
  const kernel = new Kernel()
  const bus = new FakeBus()

  beforeAll(() => {
    mkdirSync(join(batteryDir, 'BAT0'), { recursive: true })
    writeFileSync(join(batteryDir, 'BAT0', 'capacity'), '70\n')
    writeFileSync(join(batteryDir, 'BAT0', 'status'), 'Charging\n')
    kernel.mount(busProvider(bus))
  })

  afterAll(async () => {
    await kernel.dispose()
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('publishes battery state retained and tracks file changes across polls', async () => {
    const fiber = kernel.mount(systemExtension, {
      batteryDir,
      batteryPollMs: 30,
      volume: false,
    })
    await fiber.settle()
    await waitFor(() => bus.retained.has('system.battery'))

    expect(bus.retained.get('system.battery')).toEqual({
      percent: 70,
      charging: true,
      status: 'Charging',
    })

    writeFileSync(join(batteryDir, 'BAT0', 'capacity'), '69\n')
    writeFileSync(join(batteryDir, 'BAT0', 'status'), 'Discharging\n')
    await waitFor(() => {
      const state = bus.retained.get('system.battery') as { percent: number }
      return state.percent === 69
    })

    expect(bus.retained.get('system.battery')).toEqual({
      percent: 69,
      charging: false,
      status: 'Discharging',
    })

    await fiber.dispose()
    expect(bus.retained.has('system.battery')).toBe(false)
  })

  test('a machine without a battery publishes nothing and disposes cleanly', async () => {
    const emptyDir = join(tempDir, 'no-battery')
    mkdirSync(emptyDir, { recursive: true })
    const fiber = kernel.mount(systemExtension, {
      batteryDir: emptyDir,
      batteryPollMs: 30,
      volume: false,
    })
    await fiber.settle()
    await Bun.sleep(80)

    expect(bus.retained.has('system.battery')).toBe(false)
    await fiber.dispose()
  })
})
