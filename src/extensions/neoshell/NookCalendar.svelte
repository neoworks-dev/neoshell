<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record'
  import type { ViewProps } from '../../host/plugins/views'

  // The Nook's calendar widget: the month, a strip of days around today with a
  // dot under each day that has events, and the chosen day's events from the
  // calendar extension (calendar.events). A calendar's colour is its place in
  // calendar.sources.

  interface NookEvent {
    id: string
    calendarId: string
    title: string
    allDay: boolean
    start: number
    end: number
  }

  interface Day {
    date: Date
    key: string
    letter: string
    weekday: string
    number: number
    weekend: boolean
  }

  const DAYS_BEFORE = 2
  const DAYS_AFTER = 3
  const TICK_MS = 60_000
  const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const COLOR_COUNT = 5
  const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

  let { bus }: ViewProps = $props()

  let events = $state.raw<NookEvent[]>([])
  let calendarOrder = $state.raw<string[]>([])

  let today = $state(startOfDay(new Date()))
  let chosenKey = $state('')

  const days = $derived(daysAround(today))
  const todayKey = $derived(keyOf(today))
  const chosen = $derived(chosenDay(days, chosenKey, todayKey))
  const chosenEvents = $derived(eventsOn(events, chosen.date))

  $effect(() =>
    subscribeTo(bus, 'calendar.events', (message) => {
      events = arrayOf(recordOf(message.data).events).map(eventOf)
    }),
  )

  $effect(() =>
    subscribeTo(bus, 'calendar.sources', (message) => {
      calendarOrder = arrayOf(recordOf(message.data).sources).map((source) => stringOf(source.id))
    }),
  )

  // The strip follows the date past midnight without a restart.
  $effect(() => {
    const timer = setInterval(() => {
      const now = startOfDay(new Date())
      if (keyOf(now) !== keyOf(today)) {
        today = now
      }
    }, TICK_MS)
    return () => clearInterval(timer)
  })

  function eventOf(record: Record<string, unknown>): NookEvent {
    return {
      id: stringOf(record.id),
      calendarId: stringOf(record.calendarId),
      title: stringOf(record.title),
      allDay: record.allDay === true,
      start: numberOf(record.start, 0),
      end: numberOf(record.end, 0),
    }
  }

  // All-day events first, then by start. An event overlaps the day when it
  // starts before the day ends and ends after it starts.
  function eventsOn(all: NookEvent[], day: Date): NookEvent[] {
    const dayStart = day.getTime()
    const dayEnd = addDays(day, 1).getTime()
    const overlapping = all.filter((event) => event.start < dayEnd && event.end > dayStart)
    return [...overlapping.filter((event) => event.allDay), ...overlapping.filter((event) => !event.allDay)]
  }

  // One line per event: its start, and the whole span in the tooltip.
  function timeLabel(event: NookEvent): string {
    if (event.allDay) {
      return 'All day'
    }
    return TIME_FORMAT.format(new Date(event.start))
  }

  function fullTimeLabel(event: NookEvent): string {
    if (event.allDay) {
      return 'All day'
    }
    return `${TIME_FORMAT.format(new Date(event.start))} – ${TIME_FORMAT.format(new Date(event.end))}`
  }

  function colorClass(event: NookEvent, order: string[]): string {
    const index = Math.max(0, order.indexOf(event.calendarId))
    return `nook-event-color nook-event-color-${index % COLOR_COUNT}`
  }

  function daysAround(center: Date): Day[] {
    const strip: Day[] = []
    for (let offset = -DAYS_BEFORE; offset <= DAYS_AFTER; offset += 1) {
      strip.push(dayOf(addDays(center, offset)))
    }
    return strip
  }

  function dayOf(date: Date): Day {
    const weekdayIndex = date.getDay()
    return {
      date,
      key: keyOf(date),
      letter: LETTERS[weekdayIndex],
      weekday: WEEKDAYS[weekdayIndex],
      number: date.getDate(),
      weekend: weekdayIndex === 0 || weekdayIndex === 6,
    }
  }

  function chosenDay(strip: Day[], wantedKey: string, fallbackKey: string): Day {
    const found = strip.find((day) => day.key === wantedKey)
    if (found !== undefined) {
      return found
    }
    return strip.find((day) => day.key === fallbackKey) as Day
  }

  function dayClass(day: Day, chosenDayKey: string, currentTodayKey: string): string {
    const classes = ['nook-day']
    if (day.key === currentTodayKey) {
      classes.push('nook-day-today')
    }
    if (day.key === chosenDayKey) {
      classes.push('nook-day-chosen')
    }
    if (day.weekend) {
      classes.push('nook-day-weekend')
    }
    if (eventsOn(events, day.date).length > 0) {
      classes.push('nook-day-busy')
    }
    return classes.join(' ')
  }

  function headLabel(day: Day, chosenDayKey: string): string {
    if (day.key === chosenDayKey) {
      return day.weekday
    }
    return day.letter
  }

  function emptyLabel(day: Day, currentTodayKey: string): string {
    if (day.key === currentTodayKey) {
      return 'Nothing for today'
    }
    return `Nothing on ${day.weekday.toLowerCase()} ${day.number}`
  }

  function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  function addDays(date: Date, count: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count)
  }

  function keyOf(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }
</script>

<gtkbox class="nook-calendar" orientation="vertical" spacing={10} hexpand>
  <gtkbox orientation="horizontal" spacing={10}>
    <gtklabel class="nook-month" valign="center">{MONTHS[chosen.date.getMonth()]}</gtklabel>
    <gtkbox orientation="horizontal" spacing={2} homogeneous hexpand>
      {#each days as day (day.key)}
        <gtkbutton
          class={dayClass(day, chosen.key, todayKey)}
          frame={false}
          onclicked={() => (chosenKey = day.key)}
        >
          <gtkbox orientation="vertical" spacing={0}>
            <gtklabel class="nook-day-head">{headLabel(day, chosen.key)}</gtklabel>
            <gtklabel class="nook-day-number" tabular>{day.number}</gtklabel>
            <gtkbox class="nook-day-dot" halign="center"></gtkbox>
          </gtkbox>
        </gtkbutton>
      {/each}
    </gtkbox>
  </gtkbox>

  {#if chosenEvents.length === 0}
    <gtkbox class="nook-agenda" orientation="vertical" spacing={6} vexpand valign="center">
      <gtkicon icon="x-office-calendar-symbolic" size={20}></gtkicon>
      <gtklabel class="nook-agenda-empty">{emptyLabel(chosen, todayKey)}</gtklabel>
    </gtkbox>
  {:else}
    <gtkscrolledwindow hscroll="never" vexpand>
      <gtkbox orientation="vertical" spacing={4}>
        {#each chosenEvents as event (event.id)}
          <gtkbox class="nook-event" orientation="horizontal" spacing={8} tooltip={fullTimeLabel(event)}>
            <gtkbox class={colorClass(event, calendarOrder)}></gtkbox>
            <gtklabel class="nook-event-time" halign="start" xalign={0} tabular>{timeLabel(event)}</gtklabel>
            <gtklabel class="nook-event-title" halign="start" hexpand ellipsize="end">{event.title}</gtklabel>
          </gtkbox>
        {/each}
      </gtkbox>
    </gtkscrolledwindow>
  {/if}
</gtkbox>
