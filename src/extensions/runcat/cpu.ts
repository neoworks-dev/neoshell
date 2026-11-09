import { numberOf, recordOf } from '../../lib/record.js'

// CPU usage from /proc/stat, and system.cpu as a view reads it.

export interface CpuTimes {
  idle: number
  total: number
}

export interface CpuState {
  percent: number
  // The last HISTORY_LENGTH percentages, oldest first.
  history: number[]
  // 1, 5 and 15 minute load averages.
  loadAverage: number[]
}

export const HISTORY_LENGTH = 60

export const IDLE_CPU: CpuState = { percent: 0, history: [], loadAverage: [] }

// The first line of /proc/stat: "cpu user nice system idle iowait irq softirq
// steal ...". Idle time includes iowait.
export function parseCpuTimes(stat: string): CpuTimes | null {
  const fields = stat.split('\n')[0].trim().split(/\s+/)
  if (fields[0] !== 'cpu' || fields.length < 8) {
    return null
  }
  const counters = fields.slice(1, 9).map((field) => Number.parseInt(field, 10))
  if (counters.some((counter) => Number.isNaN(counter))) {
    return null
  }
  const total = counters.reduce((sum, counter) => sum + counter, 0)
  return { idle: counters[3] + counters[4], total }
}

export function usagePercent(previous: CpuTimes, current: CpuTimes): number {
  const totalDelta = current.total - previous.total
  if (totalDelta <= 0) {
    return 0
  }
  const idleDelta = current.idle - previous.idle
  return Math.round(100 * (1 - idleDelta / totalDelta))
}

// /proc/loadavg: "0.52 0.60 0.58 1/812 12345".
export function parseLoadAverage(text: string): number[] {
  return text
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((field) => Number.parseFloat(field))
    .filter((value) => !Number.isNaN(value))
}

export function cpuStateOf(data: unknown): CpuState {
  const record = recordOf(data)
  return {
    percent: numberOf(record.percent, 0),
    history: numbersOf(record.history),
    loadAverage: numbersOf(record.loadAverage),
  }
}

function numbersOf(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((entry) => typeof entry === 'number')
}
