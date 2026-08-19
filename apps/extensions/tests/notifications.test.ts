import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Kernel } from '@neoshell/kernel'
import notificationsExtension from '../notifications/backend.js'
import { busProvider, FakeBus, waitFor } from './helpers.js'

// The daemon itself is D-Bus-bound and runs against a live session; here we
// verify the extension's supervision contract with a stand-in binary: spawned
// on mount, process group killed on dispose.

const FAKE_DAEMON = `#!/bin/sh
trap 'rm -f "$MARKER"; exit 0' TERM INT
touch "$MARKER"
while true; do sleep 0.1; done
`

describe('notifications extension', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'neoshell-notify-test-'))
  const daemonPath = join(tempDir, 'fake-notifyd')
  const markerPath = join(tempDir, 'running.marker')
  const kernel = new Kernel()
  const bus = new FakeBus()

  beforeAll(() => {
    writeFileSync(daemonPath, FAKE_DAEMON)
    chmodSync(daemonPath, 0o755)
    process.env.MARKER = markerPath
    kernel.mount(busProvider(bus))
  })

  afterAll(async () => {
    delete process.env.MARKER
    await kernel.dispose()
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('mount spawns the daemon, dispose kills its process group', async () => {
    const fiber = kernel.mount(notificationsExtension, { daemonPath })
    await fiber.settle()
    expect(fiber.state).toBe('active')
    await waitFor(() => existsSync(markerPath))

    await fiber.dispose()
    await waitFor(() => !existsSync(markerPath))
  })

  test('a missing daemon binary fails the fiber instead of half-loading', async () => {
    const fiber = kernel.mount(notificationsExtension, {
      daemonPath: join(tempDir, 'does-not-exist'),
    })
    await fiber.settle()

    expect(fiber.state).toBe('failed')
  })
})
