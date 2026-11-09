import type { Plugin } from '@neoworks/extension-system'
import { RetainedTopics, registerFunction } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { numberOf, recordOf } from '../../lib/record.js'
import { requireService } from '../../lib/services.js'

// pomodoro: one countdown timer shared by every bar and menu.
//
//   pomodoro.state   {durationSeconds, remainingSeconds, running, endsAt}
//                    endsAt is an epoch in ms while running, 0 otherwise.
//                    Idle is remaining == duration and not running.
//
//   pomodoro:start   {minutes?} → {ok} | {error}   resumes a paused timer;
//                    minutes starts a fresh one of that length
//   pomodoro:pause   {} → {ok}
//   pomodoro:reset   {} → {ok}
//   pomodoro:set     {minutes} → {ok} | {error}    new length, timer reset
//
// At zero the timer stops, resets, and shows an island entry in the notch.

export interface PomodoroState {
  durationSeconds: number
  remainingSeconds: number
  running: boolean
  endsAt: number
}

const DEFAULT_MINUTES = 25
const MIN_MINUTES = 1
const MAX_MINUTES = 60
const CHECK_INTERVAL_MS = 250
const ALERT_TTL_MS = 8000

const pomodoroExtension: Plugin.Object = {
  name: 'pomodoro',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const topics = new RetainedTopics(bus)
    const timer = new PomodoroTimer(bus, topics)
    context.effect(() => () => {
      timer.stopChecking()
      topics.withdrawAll()
    })
    registerFunction(context, bus, 'pomodoro:start', (data) => timer.start(data))
    registerFunction(context, bus, 'pomodoro:pause', () => timer.pause())
    registerFunction(context, bus, 'pomodoro:reset', () => timer.reset())
    registerFunction(context, bus, 'pomodoro:set', (data) => timer.setMinutes(data))
    timer.publish()
  },
}

export default pomodoroExtension

class PomodoroTimer {
  private readonly bus: BusService
  private readonly topics: RetainedTopics
  private state: PomodoroState = idleState(DEFAULT_MINUTES * 60)
  private checkHandle: ReturnType<typeof setInterval> | null = null

  constructor(bus: BusService, topics: RetainedTopics) {
    this.bus = bus
    this.topics = topics
  }

  publish(): void {
    this.topics.set('pomodoro.state', this.state)
  }

  start(data: unknown): Record<string, unknown> {
    const minutes = recordOf(data).minutes
    if (minutes !== undefined) {
      const error = minutesError(minutes)
      if (error !== '') {
        return { error }
      }
      this.state = idleState(Math.round(numberOf(minutes, DEFAULT_MINUTES)) * 60)
    }
    this.run()
    return { ok: true }
  }

  pause(): Record<string, unknown> {
    if (!this.state.running) {
      return { ok: true }
    }
    this.stopChecking()
    this.state = {
      ...this.state,
      remainingSeconds: this.secondsLeft(),
      running: false,
      endsAt: 0,
    }
    this.publish()
    return { ok: true }
  }

  reset(): Record<string, unknown> {
    this.stopChecking()
    this.state = idleState(this.state.durationSeconds)
    this.publish()
    return { ok: true }
  }

  setMinutes(data: unknown): Record<string, unknown> {
    const minutes = recordOf(data).minutes
    const error = minutesError(minutes)
    if (error !== '') {
      return { error }
    }
    this.stopChecking()
    this.state = idleState(Math.round(numberOf(minutes, DEFAULT_MINUTES)) * 60)
    this.publish()
    return { ok: true }
  }

  stopChecking(): void {
    if (this.checkHandle === null) {
      return
    }
    clearInterval(this.checkHandle)
    this.checkHandle = null
  }

  private run(): void {
    if (this.state.running) {
      return
    }
    this.state = {
      ...this.state,
      running: true,
      endsAt: Date.now() + this.state.remainingSeconds * 1000,
    }
    this.checkHandle = setInterval(() => this.check(), CHECK_INTERVAL_MS)
    this.publish()
  }

  private check(): void {
    const remainingSeconds = this.secondsLeft()
    if (remainingSeconds <= 0) {
      this.finish()
      return
    }
    if (remainingSeconds === this.state.remainingSeconds) {
      return
    }
    this.state = { ...this.state, remainingSeconds }
    this.publish()
  }

  private finish(): void {
    this.stopChecking()
    const minutes = Math.round(this.state.durationSeconds / 60)
    this.state = idleState(this.state.durationSeconds)
    this.publish()
    this.bus.publish('island:show', {
      id: 'pomodoro',
      label: 'Time is up',
      detail: `${minutes} min timer`,
      tone: 'success',
      ttlMs: ALERT_TTL_MS,
    })
  }

  private secondsLeft(): number {
    return Math.max(0, Math.ceil((this.state.endsAt - Date.now()) / 1000))
  }
}

function idleState(durationSeconds: number): PomodoroState {
  return { durationSeconds, remainingSeconds: durationSeconds, running: false, endsAt: 0 }
}

function minutesError(minutes: unknown): string {
  if (typeof minutes !== 'number' || Number.isNaN(minutes)) {
    return 'minutes is required'
  }
  if (minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
    return `minutes must be ${MIN_MINUTES}..${MAX_MINUTES}`
  }
  return ''
}
