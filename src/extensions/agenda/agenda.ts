import { arrayOf, numberOf, stringOf } from '../../lib/record.js'

// The agenda menu's data: today's remaining calendar events and the local
// task list. Tasks live in config under agenda.tasks.

export interface AgendaEvent {
  id: string
  title: string
  allDay: boolean
  start: number
  end: number
}

export interface AgendaTask {
  id: string
  title: string
  done: boolean
  // Local date, YYYY-MM-DD.
  day: string
}

export const TASKS_KEY = 'agenda.tasks'

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

export function dayKeyOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function eventsOf(value: unknown): AgendaEvent[] {
  return arrayOf(value).map((record) => ({
    id: stringOf(record.id),
    title: stringOf(record.title),
    allDay: record.allDay === true,
    start: numberOf(record.start, 0),
    end: numberOf(record.end, 0),
  }))
}

// Events that overlap today and have not ended yet, soonest first.
export function remainingEvents(events: AgendaEvent[], now: Date): AgendaEvent[] {
  const dayStart = startOfDay(now)
  const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1)
  return events
    .filter((event) => event.start < dayEnd.getTime() && event.end > dayStart.getTime())
    .filter((event) => event.end > now.getTime())
    .sort((first, second) => first.start - second.start)
}

export function eventTimeLabel(event: AgendaEvent): string {
  if (event.allDay) {
    return 'All day'
  }
  return TIME_FORMAT.format(new Date(event.start))
}

export function tasksOf(value: unknown): AgendaTask[] {
  return arrayOf(value)
    .map((record) => ({
      id: stringOf(record.id),
      title: stringOf(record.title),
      done: record.done === true,
      day: stringOf(record.day),
    }))
    .filter((task) => task.id !== '' && task.title !== '')
}

export function newTask(title: string, day: string): AgendaTask {
  return { id: `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, title, done: false, day }
}

export function toggled(tasks: AgendaTask[], id: string): AgendaTask[] {
  return tasks.map((task) => {
    if (task.id !== id) {
      return task
    }
    return { ...task, done: !task.done }
  })
}

export function without(tasks: AgendaTask[], id: string): AgendaTask[] {
  return tasks.filter((task) => task.id !== id)
}

// Pango markup with the count in bold; the noun is a fixed word, never user text.
export function countHeading(count: number, noun: string, tail: string): string {
  return `You have <b>${plural(count, noun)}</b> ${tail}`
}

export function plural(count: number, noun: string): string {
  if (count === 1) {
    return `${count} ${noun}`
  }
  return `${count} ${noun}s`
}
