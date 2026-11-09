import { NO_READING } from './parse.js'
import type { ContainerItem, Counts } from './parse.js'
import { ENGINE_NAMES } from './topic.js'
import type { EngineStatus } from './topic.js'

// The words the card prints, kept apart from the widgets so they can be tested.

export interface Attention {
  text: string
  // success | warning | error | neutral
  tone: string
}

/** The containers that are up: the headline number. */
export function upCountOf(counts: Counts): number {
  return counts.running + counts.starting + counts.unhealthy
}

export function attentionOf(counts: Counts): Attention {
  const trouble = counts.unhealthy + counts.failed
  if (trouble > 0) {
    return { text: `${trouble} need${plural(trouble, 's', '')} attention`, tone: 'error' }
  }
  if (counts.starting > 0) {
    return { text: `${counts.starting} starting`, tone: 'warning' }
  }
  if (upCountOf(counts) > 0) {
    return { text: 'All healthy', tone: 'success' }
  }
  return { text: 'Nothing running', tone: 'neutral' }
}

/** The ending a count takes: `one` for exactly one, `many` otherwise. */
function plural(count: number, one: string, many: string): string {
  if (count === 1) {
    return one
  }
  return many
}

/** "3 stopped", or '' when none. */
export function stoppedLineOf(counts: Counts): string {
  const stopped = counts.stopped + counts.paused
  if (stopped === 0) {
    return ''
  }
  return `${stopped} stopped`
}

/** The row's second line: where it is running and how it is doing. */
export function sublineOf(item: ContainerItem): string {
  if (item.engine === 'kubernetes') {
    return podSublineOf(item)
  }
  return [item.detail, placeOf(item)].filter((part) => part !== '').join(' · ')
}

function placeOf(item: ContainerItem): string {
  if (item.group !== '') {
    return item.group
  }
  return item.image
}

function podSublineOf(item: ContainerItem): string {
  const parts = [item.group, item.ready, item.detail]
  if (item.restarts > 0) {
    parts.push(`${item.restarts} restart${plural(item.restarts, '', 's')}`)
  }
  return parts.filter((part) => part !== '').join(' · ')
}

/** What the card says about each engine: counts for those working, the reason for those failing. */
export function engineLineOf(engines: EngineStatus[]): string {
  return engines
    .flatMap((engine) => {
      if (engine.status === 'ok') {
        return [`${ENGINE_NAMES[engine.engine]} ${engine.count}`]
      }
      if (engine.status === 'error') {
        return [`${ENGINE_NAMES[engine.engine]}: ${engine.message}`]
      }
      return []
    })
    .join(' · ')
}

export function cpuLabelOf(item: ContainerItem): string {
  if (item.cpu === NO_READING) {
    return ''
  }
  return `${Math.round(item.cpu)}%`
}

/** CPU is a share of one core and can pass 100 on several; the meter stops at full. */
export function cpuFractionOf(item: ContainerItem): number {
  if (item.cpu === NO_READING) {
    return 0
  }
  return Math.min(1, item.cpu / 100)
}

export function cpuToneOf(item: ContainerItem): string {
  if (item.cpu >= 85) {
    return 'error'
  }
  if (item.cpu >= 60) {
    return 'warning'
  }
  return 'accent'
}

/** Whether a row has a usage reading to draw. */
export function hasUsage(item: ContainerItem): boolean {
  return item.cpu !== NO_READING
}

/** The label under an empty list. */
export function emptyLineOf(counts: Counts): string {
  if (counts.total === 0) {
    return 'No containers or pods yet.'
  }
  return `Nothing running. ${counts.stopped} stopped.`
}
