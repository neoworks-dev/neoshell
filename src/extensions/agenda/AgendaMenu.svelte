<script lang="ts">
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { recordOf } from '../../lib/record'
  import { Settings } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import { TASKS_KEY, countHeading, dayKeyOf, eventTimeLabel, eventsOf, newTask, remainingEvents, tasksOf, toggled, without } from './agenda'
  import type { AgendaEvent, AgendaTask } from './agenda'

  // The agenda status item's menu: the date, what is left on today's calendar
  // (calendar.events) and a small task list kept in config (agenda.tasks).

  const WIDTH = 320
  const MAX_LIST_HEIGHT = 380
  const TICK_MS = 30_000
  const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'long' })
  const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

  let { bus }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))

  let now = $state(new Date())
  let events = $state.raw<AgendaEvent[]>([])
  let draft = $state('')

  const todayKey = $derived(dayKeyOf(now))
  const allTasks = $derived(tasksOf(settings.value(TASKS_KEY)))
  const todayTasks = $derived(allTasks.filter((task) => task.day === todayKey))
  const upcoming = $derived(remainingEvents(events, now))

  $effect(() => settings.connect())

  $effect(() =>
    subscribeTo(bus, 'calendar.events', (message) => {
      events = eventsOf(recordOf(message.data).events)
    }),
  )

  $effect(() => {
    const timer = setInterval(() => {
      now = new Date()
    }, TICK_MS)
    return () => clearInterval(timer)
  })

  function addTask(): void {
    const title = draft.trim()
    if (title === '') {
      return
    }
    draft = ''
    settings.set(TASKS_KEY, [...allTasks, newTask(title, todayKey)])
  }

  function toggleTask(task: AgendaTask): void {
    settings.set(TASKS_KEY, toggled(allTasks, task.id))
  }

  function removeTask(task: AgendaTask): void {
    settings.set(TASKS_KEY, without(allTasks, task.id))
  }

  function checkClass(done: boolean): string {
    if (done) {
      return 'agenda-check agenda-check-done'
    }
    return 'agenda-check'
  }

  function taskClass(done: boolean): string {
    if (done) {
      return 'agenda-task-title agenda-task-done'
    }
    return 'agenda-task-title'
  }
</script>

<gtkbox class="agenda" orientation="vertical" spacing={14} width={WIDTH}>
  <gtkbox orientation="horizontal" spacing={5} margin-start={4}>
    <gtklabel class="cc-title">{WEEKDAY_FORMAT.format(now)}</gtklabel>
    <gtklabel class="agenda-date">{DATE_FORMAT.format(now)}</gtklabel>
  </gtkbox>

  <gtkscrolledwindow hscroll="never" max-content-height={MAX_LIST_HEIGHT} propagate-height>
    <gtkbox orientation="vertical" spacing={14}>
      {@render eventsBlock()}
      {@render tasksBlock()}
    </gtkbox>
  </gtkscrolledwindow>

  <gtkentry
    class="agenda-entry"
    placeholder="Add a task for today"
    text={draft}
    onchanged={(event: { target: { widget: { get_text(): string } } }) => (draft = event.target.widget.get_text())}
    onactivate={addTask}
  ></gtkentry>
</gtkbox>

{#snippet eventsBlock()}
  <gtkbox class="cc-block" orientation="vertical" spacing={6}>
    {#if upcoming.length === 0}
      <gtklabel class="cc-title" halign="start">Nothing left today</gtklabel>
      <gtklabel class="cc-subtitle" halign="start">Your calendar is clear.</gtklabel>
    {:else}
      <gtklabel class="agenda-heading" halign="start" markup>{countHeading(upcoming.length, 'event', 'remaining today')}</gtklabel>
      {#each upcoming as event (event.id + event.start)}
        <gtkbox orientation="horizontal" spacing={8}>
          <gtkbox class="agenda-event-bar" valign="center"></gtkbox>
          <gtklabel class="agenda-event-title" halign="start" hexpand ellipsize="end">{event.title}</gtklabel>
          <gtklabel class="cc-subtitle" tabular>{eventTimeLabel(event)}</gtklabel>
        </gtkbox>
      {/each}
    {/if}
  </gtkbox>
{/snippet}

{#snippet tasksBlock()}
  <gtkbox class="cc-block" orientation="vertical" spacing={6}>
    {#if todayTasks.length === 0}
      <gtklabel class="cc-title" halign="start">No tasks</gtklabel>
      <gtklabel class="cc-subtitle" halign="start">Add one below.</gtklabel>
    {:else}
      <gtklabel class="agenda-heading" halign="start" markup>{countHeading(todayTasks.length, 'task', 'today')}</gtklabel>
      {#each todayTasks as task (task.id)}
        <gtkbox orientation="horizontal" spacing={8}>
          <gtkbutton class={checkClass(task.done)} frame={false} valign="center" onclicked={() => toggleTask(task)}>
            {#if task.done}
              <gtkicon icon="object-select-symbolic" size={10}></gtkicon>
            {/if}
          </gtkbutton>
          <gtklabel class={taskClass(task.done)} halign="start" hexpand ellipsize="end">{task.title}</gtklabel>
          <gtkbutton class="agenda-remove" frame={false} valign="center" tooltip="Remove" onclicked={() => removeTask(task)}>
            <gtkicon icon="window-close-symbolic" size={10}></gtkicon>
          </gtkbutton>
        </gtkbox>
      {/each}
    {/if}
  </gtkbox>
{/snippet}
