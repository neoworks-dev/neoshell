import { numberOf, recordOf } from '../../lib/record.js'

// pomodoro.state as a view reads it.

export interface TimerState {
  durationSeconds: number
  remainingSeconds: number
  running: boolean
}

export const DEFAULT_STATE: TimerState = { durationSeconds: 1500, remainingSeconds: 1500, running: false }

export function timerStateOf(data: unknown): TimerState {
  const record = recordOf(data)
  return {
    durationSeconds: numberOf(record.durationSeconds, DEFAULT_STATE.durationSeconds),
    remainingSeconds: numberOf(record.remainingSeconds, DEFAULT_STATE.remainingSeconds),
    running: record.running === true,
  }
}

export function isIdle(state: TimerState): boolean {
  return !state.running && state.remainingSeconds === state.durationSeconds
}

export function clockLabel(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
