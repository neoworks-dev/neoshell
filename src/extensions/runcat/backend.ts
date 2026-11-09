import type { Plugin } from '@neoworks/extension-system'
import { RetainedTopics } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { requireService } from '../../lib/services.js'
import { readTextFile } from '../../gjs/fs.js'
import { HISTORY_LENGTH, parseCpuTimes, parseLoadAverage, usagePercent } from './cpu.js'
import type { CpuTimes } from './cpu.js'

// runcat: CPU usage as a retained bus topic, sampled every second from
// /proc/stat.
//
//   system.cpu   {percent, history, loadAverage}
//                history is the last 60 percentages, oldest first;
//                loadAverage is the 1, 5 and 15 minute figures.

const SAMPLE_INTERVAL_MS = 1000

const runcatExtension: Plugin.Object = {
  name: 'runcat',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const topics = new RetainedTopics(bus)
    const sampler = new CpuSampler(topics)
    context.effect(() => {
      sampler.sample()
      const timer = setInterval(() => sampler.sample(), SAMPLE_INTERVAL_MS)
      return () => {
        clearInterval(timer)
        topics.withdrawAll()
      }
    })
  },
}

export default runcatExtension

class CpuSampler {
  private readonly topics: RetainedTopics
  private previous: CpuTimes | null = null
  private history: number[] = []

  constructor(topics: RetainedTopics) {
    this.topics = topics
  }

  sample(): void {
    const stat = readTextFile('/proc/stat')
    if (stat === null) {
      return
    }
    const current = parseCpuTimes(stat)
    if (current === null) {
      return
    }
    const previous = this.previous
    this.previous = current
    if (previous === null) {
      return
    }
    this.publish(usagePercent(previous, current))
  }

  private publish(percent: number): void {
    this.history = [...this.history, percent].slice(-HISTORY_LENGTH)
    this.topics.set('system.cpu', {
      percent,
      history: this.history,
      loadAverage: parseLoadAverage(loadAverageText()),
    })
  }
}

function loadAverageText(): string {
  const text = readTextFile('/proc/loadavg')
  if (text === null) {
    return ''
  }
  return text
}
