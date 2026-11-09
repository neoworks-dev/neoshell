<script lang="ts">
  import { untrack } from 'svelte'
  import {
    Button,
    IconButton,
    List,
    ListRow,
    SectionHeader,
    SegmentedButton,
    Switch,
    TextField,
  } from '@neoworks/gtk-ui'
  import { subscribeTo } from '../../lib/bus'
  import { Settings } from '../../lib/settings.svelte'
  import type { ViewProps } from '../../host/plugins/views'
  import { contributionsOf } from './lib'
  import { MAX_REPOS, isValidRepo, isValidUser, settingsOf } from './settings'
  import type { GithubSettings as Current } from './settings'
  import type { ContributionsState } from './model'

  // Settings → GitHub: which account and repositories the three GitHub cards
  // show, how often they refresh, and which issue and notification lists they
  // include. Everything is written to the config's "github" section, which the
  // backend fetches by and the cards read.

  const INTERVAL_OPTIONS = [
    { value: '5', label: '5 min' },
    { value: '10', label: '10 min' },
    { value: '15', label: '15 min' },
    { value: '30', label: '30 min' },
    { value: '60', label: '1 hour' },
  ]

  let { bus }: ViewProps = $props()

  const settings = new Settings(untrack(() => bus))

  let current = $state<Current>(settingsOf({}))
  let account = $state<ContributionsState | null>(null)
  let userDraft = $state('')
  let userError = $state(false)
  let repoDraft = $state('')
  let repoError = $state('')
  let userLoaded = false

  $effect(() =>
    subscribeTo(bus, 'config', (message) => {
      current = settingsOf(message.data)
      if (!userLoaded) {
        userLoaded = true
        userDraft = current.user
      }
    }),
  )
  $effect(() =>
    subscribeTo(bus, 'github.contributions', (message) => {
      account = contributionsOf(message.data)
    }),
  )

  function accountTitle(state: ContributionsState | null): string {
    if (state === null) {
      return 'Checking the GitHub CLI…'
    }
    if (state.status === 'ok') {
      return `Showing @${state.login}`
    }
    return 'GitHub is not reachable'
  }

  function accountSubtitle(state: ContributionsState | null): string {
    if (state === null) {
      return 'Waiting for the first answer from gh.'
    }
    if (state.status === 'ok') {
      return 'Read through the gh CLI; the shell never sees your token.'
    }
    return state.message
  }

  function saveUser(): void {
    const user = userDraft.trim().replace(/^@/, '')
    userError = user !== '' && !isValidUser(user)
    if (userError) {
      return
    }
    settings.set('github.user', user)
  }

  function addRepo(): void {
    const repo = repoDraft.trim()
    repoError = repoErrorOf(repo)
    if (repoError !== '') {
      return
    }
    settings.set('github.repos', [...current.repos, repo])
    repoDraft = ''
  }

  function repoErrorOf(repo: string): string {
    if (!isValidRepo(repo)) {
      return 'Use the form owner/name.'
    }
    if (current.repos.includes(repo)) {
      return 'Already in the list.'
    }
    if (current.repos.length >= MAX_REPOS) {
      return `At most ${MAX_REPOS} repositories.`
    }
    return ''
  }

  function removeRepo(repo: string): void {
    settings.set(
      'github.repos',
      current.repos.filter((entry) => entry !== repo),
    )
  }

  function userHint(invalid: boolean): string {
    if (invalid) {
      return 'That is not a valid GitHub username.'
    }
    return 'Press Enter to apply. Notifications always belong to the signed-in account.'
  }

  function setRefreshInterval(value: string): void {
    settings.set('github.pollMinutes', Number(value))
  }
</script>

<gtkbox class="settings-content" orientation="vertical" spacing={8}>
  <SectionHeader title="Account" description="Whose activity the GitHub widgets show." level={3} />
  <List variant="card" dividers>
    <ListRow title={accountTitle(account)} subtitle={accountSubtitle(account)} />
  </List>
  <TextField
    label="Username"
    placeholder="The account gh is signed in as"
    bind:value={userDraft}
    error={userError}
    supportingText={userHint(userError)}
    onsubmit={saveUser}
  />

  <SectionHeader
    title="Repositories"
    description="The repositories in Repository activity. With none, your most recently pushed ones show."
    level={3}
  />
  <List variant="card" dividers>
    {#each current.repos as repo (repo)}
      <ListRow title={repo}>
        {#snippet trailing()}
          <IconButton icon="user-trash-symbolic" label="Remove {repo}" size="sm" onclick={() => removeRepo(repo)} />
        {/snippet}
      </ListRow>
    {:else}
      <ListRow title="Most recently pushed" subtitle="Add a repository below to choose your own." />
    {/each}
  </List>
  <gtkbox orientation="horizontal" spacing={8} valign="start">
    <gtkbox hexpand>
      <TextField
        label="Add a repository"
        placeholder="owner/name"
        bind:value={repoDraft}
        error={repoError !== ''}
        supportingText={repoError}
        onsubmit={addRepo}
      />
    </gtkbox>
    <gtkbox valign="center">
      <Button variant="primary" label="Add" disabled={repoDraft.trim() === ''} onclick={addRepo} />
    </gtkbox>
  </gtkbox>

  <SectionHeader title="Refresh" description="How often the cards ask GitHub again." level={3} />
  <SegmentedButton
    options={INTERVAL_OPTIONS}
    value={String(current.pollMinutes)}
    label="Refresh interval"
    onchange={setRefreshInterval}
  />

  <SectionHeader title="Issues & notifications" description="What the Issues & PRs card lists." level={3} />
  <List variant="card" dividers>
    <ListRow title="Assigned to me">
      {#snippet trailing()}
        <Switch label="Assigned to me" hideLabel checked={current.showAssigned} onchange={(on) => settings.set('github.assigned', on)} />
      {/snippet}
    </ListRow>
    <ListRow title="Created by me">
      {#snippet trailing()}
        <Switch label="Created by me" hideLabel checked={current.showAuthored} onchange={(on) => settings.set('github.authored', on)} />
      {/snippet}
    </ListRow>
    <ListRow title="Include pull requests">
      {#snippet trailing()}
        <Switch label="Include pull requests" hideLabel checked={current.showPullRequests} onchange={(on) => settings.set('github.pullRequests', on)} />
      {/snippet}
    </ListRow>
    <ListRow title="Show notifications">
      {#snippet trailing()}
        <Switch label="Show notifications" hideLabel checked={current.showNotifications} onchange={(on) => settings.set('github.notifications', on)} />
      {/snippet}
    </ListRow>
    <ListRow title="Unread notifications only" subtitle="Off also lists the ones you have already read.">
      {#snippet trailing()}
        <Switch label="Unread notifications only" hideLabel checked={current.unreadOnly} onchange={(on) => settings.set('github.unreadOnly', on)} />
      {/snippet}
    </ListRow>
  </List>
</gtkbox>
