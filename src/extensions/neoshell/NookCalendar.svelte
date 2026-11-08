<script lang="ts">
  // The Nook's calendar widget: the month, a strip of days around today, and
  // what is on the chosen day. Events are not wired yet, so every day reads
  // as free.

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

  let today = $state(startOfDay(new Date()))
  let chosenKey = $state('')

  const days = $derived(daysAround(today))
  const todayKey = $derived(keyOf(today))
  const chosen = $derived(chosenDay(days, chosenKey, todayKey))

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
          </gtkbox>
        </gtkbutton>
      {/each}
    </gtkbox>
  </gtkbox>

  <gtkbox class="nook-agenda" orientation="vertical" spacing={6} vexpand valign="center">
    <gtkicon icon="x-office-calendar-symbolic" size={20}></gtkicon>
    <gtklabel class="nook-agenda-empty">{emptyLabel(chosen, todayKey)}</gtklabel>
  </gtkbox>
</gtkbox>
