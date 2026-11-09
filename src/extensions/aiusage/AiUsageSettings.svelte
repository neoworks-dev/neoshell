<script lang="ts">
  import { List, ListRow, SectionHeader, Switch, TextField } from '@neoworks/gtk-ui'
  import { untrack } from 'svelte'
  import { subscribeTo } from '../../lib/bus'
  import { debounced } from '../../lib/debounce'
  import { Settings } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import { limitNoteOf } from './display'
  import { aiUsageStateOf } from './topic'
  import type { AiUsageState } from './topic'
  import type { AgentId } from './summary'

  // Settings → AI usage: which agents to read, how full a Claude Code window
  // is allowed to get, and where the logs are. Text is applied a moment after
  // typing stops: every change reads the logs again.

  const TYPING_PAUSE_MS = 700

  let { bus }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))

  let state = $state<AiUsageState | null>(null)
  let limitDraft = $state('')
  let claudeDirDraft = $state('')
  let codexDirDraft = $state('')
  let seeded = false

  const applyLimit = debounced(() => settings.set('aiusage.claudeLimit', parsedLimit(limitDraft)), TYPING_PAUSE_MS)
  const applyClaudeDir = debounced(() => settings.set('aiusage.claudeDir', claudeDirDraft.trim()), TYPING_PAUSE_MS)
  const applyCodexDir = debounced(() => settings.set('aiusage.codexDir', codexDirDraft.trim()), TYPING_PAUSE_MS)

  const claudeOn = $derived(settings.boolean('aiusage.agents.claude', true))
  const codexOn = $derived(settings.boolean('aiusage.agents.codex', true))
  const limitInvalid = $derived(limitDraft.trim() !== '' && !isWholeNumber(limitDraft))
  const limitNote = $derived(limitNoteFor(state))

  $effect(() => settings.connect())

  // The drafts start as what is saved, once: the snapshot arrives after the
  // page is up, and the republish that follows an edit must not overwrite
  // what is being typed.
  $effect(() => {
    if (seeded || settings.value('aiusage') === undefined) {
      return
    }
    seeded = true
    untrack(() => {
      limitDraft = String(settings.number('aiusage.claudeLimit', 0))
      claudeDirDraft = settings.string('aiusage.claudeDir', '')
      codexDirDraft = settings.string('aiusage.codexDir', '')
    })
  })

  $effect(() =>
    subscribeTo(bus, 'aiusage.state', (message) => {
      state = aiUsageStateOf(message.data)
    }),
  )

  $effect(() => () => {
    applyLimit.cancel()
    applyClaudeDir.cancel()
    applyCodexDir.cancel()
  })

  function isWholeNumber(text: string): boolean {
    return /^\d+$/.test(text.trim())
  }

  function parsedLimit(text: string): number {
    if (!isWholeNumber(text)) {
      return 0
    }
    return Number(text.trim())
  }

  function statusOf(agent: AgentId): string {
    if (state === null) {
      return 'Checking…'
    }
    const found = state.agents.find((candidate) => candidate.id === agent)
    if (found === undefined || found.status === 'disabled') {
      return 'Off'
    }
    if (found.status === 'missing') {
      return 'No logs found in that folder'
    }
    return `${found.today.messages} responses today`
  }

  function limitNoteFor(current: AiUsageState | null): string {
    if (current === null) {
      return ''
    }
    const claude = current.agents.find((agent) => agent.id === 'claude')
    if (claude === undefined) {
      return ''
    }
    return limitNoteOf(claude.window)
  }

  function setAgent(agent: AgentId, on: boolean): void {
    settings.set(`aiusage.agents.${agent}`, on)
  }

  function limitHint(note: string): string {
    if (note === '') {
      return 'Fresh tokens (input, output and cache writes) a five-hour window counts as full. 0 uses your busiest window of the last two days.'
    }
    return `${note}. 0 uses your busiest window of the last two days.`
  }
</script>

<gtkbox class="settings-content" orientation="vertical" spacing={8}>
  <SectionHeader title="AI usage" description="Token use, windows and live sessions of coding agents, read from their logs on this computer." level={3} />

  <List variant="card" dividers>
    <ListRow title="Claude Code" subtitle={statusOf('claude')}>
      {#snippet trailing()}
        <Switch label="Claude Code" hideLabel checked={claudeOn} onchange={(on) => setAgent('claude', on)} />
      {/snippet}
    </ListRow>
    <ListRow title="Codex" subtitle={statusOf('codex')}>
      {#snippet trailing()}
        <Switch label="Codex" hideLabel checked={codexOn} onchange={(on) => setAgent('codex', on)} />
      {/snippet}
    </ListRow>
  </List>

  <SectionHeader
    title="Claude Code window"
    description="Anthropic does not publish its plan limits in tokens, so the percentage is measured against a budget you choose. Codex reports its plan's limits itself."
    level={3}
  />
  <TextField
    label="Tokens per five-hour window"
    placeholder="0"
    bind:value={limitDraft}
    oninput={applyLimit}
    disabled={!claudeOn}
    error={limitInvalid}
    supportingText={limitHint(limitNote)}
  />

  <SectionHeader title="Log folders" description="Where the agents keep their sessions. Empty uses the default." level={3} />
  <gtkbox orientation="vertical" spacing={12}>
    <TextField
      label="Claude Code"
      placeholder="~/.claude/projects"
      icon="folder-symbolic"
      bind:value={claudeDirDraft}
      oninput={applyClaudeDir}
      disabled={!claudeOn}
    />
    <TextField
      label="Codex"
      placeholder="~/.codex/sessions"
      icon="folder-symbolic"
      bind:value={codexDirDraft}
      oninput={applyCodexDir}
      disabled={!codexOn}
    />
  </gtkbox>
</gtkbox>
