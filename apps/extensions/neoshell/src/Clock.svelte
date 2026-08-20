<script lang="ts">
  const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  let now = $state(new Date())

  $effect(() => {
    const timer = setInterval(() => {
      now = new Date()
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  })
</script>

<div class="flex items-center gap-2 tabular-nums">
  <span class="text-base-content/60">{DATE_FORMAT.format(now)}</span>
  <span>{TIME_FORMAT.format(now)}</span>
</div>
