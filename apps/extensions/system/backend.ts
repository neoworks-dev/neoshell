import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context, Plugin } from '@neoshell/kernel'

// system: battery and audio state as retained bus topics. First in-process
// extension — the Go core's internal/system pollers, moved out of the runtime.
//
//   system.battery  {percent, charging, status}   30s poll over /sys
//   system.volume   {volume, muted}               wpctl, re-read on pactl events

// Structural view of the host's bus service. Extensions depend on the shape,
// not the host package.
interface BusService {
  publish(type: string, data: unknown): void
  retain(type: string, data: unknown): () => void
}

interface SystemConfig {
  batteryDir?: string
  batteryPollMs?: number
  volume?: boolean
}

interface BatteryState {
  percent: number
  charging: boolean
  status: string
}

interface VolumeState {
  volume: number
  muted: boolean
}

interface ResolvedConfig {
  batteryDir: string
  batteryPollMs: number
  volume: boolean
}

const systemExtension: Plugin<SystemConfig | undefined> = {
  name: 'system',
  inject: ['bus'],
  apply(context, config) {
    const bus = context.require<BusService>('bus')
    const options = resolveConfig(config)
    startBatteryPoller(context, bus, options)
    if (options.volume) {
      startVolumeWatcher(context, bus)
    }
  },
}

export default systemExtension

function resolveConfig(config: SystemConfig | undefined): ResolvedConfig {
  const resolved: ResolvedConfig = {
    batteryDir: '/sys/class/power_supply',
    batteryPollMs: 30_000,
    volume: true,
  }
  if (config === undefined) {
    return resolved
  }
  if (config.batteryDir !== undefined) {
    resolved.batteryDir = config.batteryDir
  }
  if (config.batteryPollMs !== undefined) {
    resolved.batteryPollMs = config.batteryPollMs
  }
  if (config.volume !== undefined) {
    resolved.volume = config.volume
  }
  return resolved
}

function startBatteryPoller(context: Context, bus: BusService, options: ResolvedConfig): void {
  let withdraw: (() => void) | null = null
  const publish = async () => {
    const state = await readBattery(options.batteryDir)
    if (state === null) {
      return
    }
    if (withdraw !== null) {
      withdraw()
    }
    withdraw = bus.retain('system.battery', state)
  }
  context.effect(() => {
    void publish()
    const timer = setInterval(() => void publish(), options.batteryPollMs)
    return () => {
      clearInterval(timer)
      withdrawIfSet(withdraw)
    }
  })
}

function startVolumeWatcher(context: Context, bus: BusService): void {
  let withdraw: (() => void) | null = null
  const publish = async () => {
    const state = await readVolume()
    if (state === null) {
      return
    }
    if (withdraw !== null) {
      withdraw()
    }
    withdraw = bus.retain('system.volume', state)
  }
  context.effect(() => {
    void publish()
    const stopWatching = watchAudioEvents(publish)
    return () => {
      stopWatching()
      withdrawIfSet(withdraw)
    }
  })
}

function withdrawIfSet(withdraw: (() => void) | null): void {
  if (withdraw !== null) {
    withdraw()
  }
}

async function readBattery(dir: string): Promise<BatteryState | null> {
  const batteryPath = await findBattery(dir)
  if (batteryPath === null) {
    return null
  }
  const capacityRaw = await readTextFile(join(batteryPath, 'capacity'))
  if (capacityRaw === null) {
    return null
  }
  const statusRaw = await readTextFile(join(batteryPath, 'status'))
  let status = ''
  if (statusRaw !== null) {
    status = statusRaw.trim()
  }
  return {
    percent: Number.parseInt(capacityRaw.trim(), 10),
    charging: status === 'Charging',
    status,
  }
}

async function findBattery(dir: string): Promise<string | null> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return null
  }
  for (const entry of entries) {
    if (entry.startsWith('BAT')) {
      return join(dir, entry)
    }
  }
  return null
}

async function readTextFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

// watchAudioEvents re-reads the volume on every pactl sink event, so changes
// land instantly instead of on a poll. Missing pactl degrades to the single
// read at startup.
function watchAudioEvents(publish: () => Promise<void>): () => void {
  let subscriber: ReturnType<typeof Bun.spawn>
  try {
    subscriber = Bun.spawn(['pactl', 'subscribe'], { stdout: 'pipe', stderr: 'ignore' })
  } catch (error) {
    console.error('system: pactl unavailable, volume events disabled:', error)
    return () => {}
  }
  void forwardSinkEvents(subscriber, publish)
  return () => subscriber.kill()
}

async function forwardSinkEvents(
  subscriber: ReturnType<typeof Bun.spawn>,
  publish: () => Promise<void>,
): Promise<void> {
  const decoder = new TextDecoder()
  for await (const chunk of subscriber.stdout as ReadableStream<Uint8Array>) {
    if (decoder.decode(chunk).includes('sink')) {
      void publish()
    }
  }
}

async function readVolume(): Promise<VolumeState | null> {
  let output = ''
  try {
    const process = Bun.spawn(['wpctl', 'get-volume', '@DEFAULT_AUDIO_SINK@'], {
      stdout: 'pipe',
      stderr: 'ignore',
    })
    output = await new Response(process.stdout as ReadableStream).text()
    await process.exited
  } catch {
    return null
  }
  return parseVolume(output)
}

// wpctl prints "Volume: 0.75" or "Volume: 0.75 [MUTED]".
function parseVolume(output: string): VolumeState | null {
  const fields = output.trim().split(/\s+/)
  if (fields.length < 2) {
    return null
  }
  const level = Number.parseFloat(fields[1])
  if (Number.isNaN(level)) {
    return null
  }
  return { volume: Math.round(level * 100), muted: output.includes('[MUTED]') }
}
