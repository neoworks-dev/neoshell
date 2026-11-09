<script lang="ts">
  import { List, ListRow, SectionHeader, Slider, Switch, TextField } from '@neoworks/gtk-ui'
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { debounced } from '../../lib/debounce'
  import { Settings } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import { DEFAULT_POLL_SECONDS } from './options'
  import { containersStateOf } from './topic'
  import type { ContainersState } from './topic'
  import type { Engine } from './parse'

  // Settings → Containers: which engines to ask, which Kubernetes context and
  // namespace, and whether stopped containers are listed. Text is applied a
  // moment after typing stops: every change asks the engines again.

  const TYPING_PAUSE_MS = 700
  const MIN_POLL_SECONDS = 3
  const MAX_POLL_SECONDS = 60

  let { bus }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))

  let state = $state<ContainersState | null>(null)
  let contextDraft = $state('')
  let namespaceDraft = $state('')
  let seeded = false

  const applyContext = debounced(() => settings.set('containers.kubeContext', contextDraft.trim()), TYPING_PAUSE_MS)
  const applyNamespace = debounced(
    () => settings.set('containers.kubeNamespace', namespaceDraft.trim()),
    TYPING_PAUSE_MS,
  )

  const dockerOn = $derived(settings.boolean('containers.engines.docker', true))
  const podmanOn = $derived(settings.boolean('containers.engines.podman', true))
  const kubernetesOn = $derived(settings.boolean('containers.engines.kubernetes', true))
  const allNamespaces = $derived(settings.boolean('containers.allNamespaces', false))
  const showStopped = $derived(settings.boolean('containers.showStopped', false))
  const pollSeconds = $derived(settings.number('containers.pollSeconds', DEFAULT_POLL_SECONDS))

  $effect(() => settings.connect())

  // The drafts start as what is saved, once: the snapshot arrives after the
  // page is up, and the republish that follows an edit must not overwrite
  // what is being typed.
  $effect(() => {
    if (seeded || settings.value('containers') === undefined) {
      return
    }
    seeded = true
    untrack(() => {
      contextDraft = settings.string('containers.kubeContext', '')
      namespaceDraft = settings.string('containers.kubeNamespace', '')
    })
  })

  $effect(() =>
    subscribeTo(bus, 'containers.state', (message) => {
      state = containersStateOf(message.data)
    }),
  )

  $effect(() => () => {
    applyContext.cancel()
    applyNamespace.cancel()
  })

  function statusOf(engine: Engine): string {
    if (state === null) {
      return 'Checking…'
    }
    const found = state.engines.find((candidate) => candidate.engine === engine)
    if (found === undefined || found.status === 'disabled') {
      return 'Off'
    }
    if (found.status === 'ok') {
      return `${found.count} found`
    }
    return found.message
  }

  function setEngine(engine: Engine, on: boolean): void {
    settings.set(`containers.engines.${engine}`, on)
  }

  function secondsLabel(seconds: number): string {
    return `${seconds} s`
  }
</script>

<gtkbox class="settings-content" orientation="vertical" spacing={8}>
  <SectionHeader title="Containers" description="Docker and Podman containers and Kubernetes pods on the desktop." level={3} />

  <List variant="card" dividers>
    <ListRow title="Docker" subtitle={statusOf('docker')}>
      {#snippet trailing()}
        <Switch label="Docker" hideLabel checked={dockerOn} onchange={(on) => setEngine('docker', on)} />
      {/snippet}
    </ListRow>
    <ListRow title="Podman" subtitle={statusOf('podman')}>
      {#snippet trailing()}
        <Switch label="Podman" hideLabel checked={podmanOn} onchange={(on) => setEngine('podman', on)} />
      {/snippet}
    </ListRow>
    <ListRow title="Kubernetes" subtitle={statusOf('kubernetes')}>
      {#snippet trailing()}
        <Switch label="Kubernetes" hideLabel checked={kubernetesOn} onchange={(on) => setEngine('kubernetes', on)} />
      {/snippet}
    </ListRow>
  </List>

  <SectionHeader title="Kubernetes" description="Which cluster the pods come from. Empty uses kubectl's current choice." level={3} />
  <gtkbox orientation="vertical" spacing={12}>
    <TextField
      label="Context"
      placeholder="current context"
      bind:value={contextDraft}
      oninput={applyContext}
      disabled={!kubernetesOn}
    />
    <TextField
      label="Namespace"
      placeholder="the context's namespace"
      bind:value={namespaceDraft}
      oninput={applyNamespace}
      disabled={!kubernetesOn || allNamespaces}
    />
  </gtkbox>
  <List variant="card" dividers>
    <ListRow title="All namespaces" subtitle="List the pods of every namespace">
      {#snippet trailing()}
        <Switch
          label="All namespaces"
          hideLabel
          checked={allNamespaces}
          disabled={!kubernetesOn}
          onchange={(on) => settings.set('containers.allNamespaces', on)}
        />
      {/snippet}
    </ListRow>
  </List>

  <SectionHeader title="Display" level={3} />
  <List variant="card" dividers>
    <ListRow title="Show stopped containers" subtitle="Stopped containers are still counted when hidden">
      {#snippet trailing()}
        <Switch
          label="Show stopped containers"
          hideLabel
          checked={showStopped}
          onchange={(on) => settings.set('containers.showStopped', on)}
        />
      {/snippet}
    </ListRow>
    <ListRow title="Refresh every" subtitle="How often the engines are asked">
      {#snippet trailing()}
        <Slider
          value={pollSeconds}
          min={MIN_POLL_SECONDS}
          max={MAX_POLL_SECONDS}
          step={1}
          showValue
          formatValue={secondsLabel}
          oninput={(seconds) => settings.set('containers.pollSeconds', seconds)}
        />
      {/snippet}
    </ListRow>
  </List>
</gtkbox>
