<script lang="ts">
  import { subscribeTo } from '../../lib/bus'
  import type { ViewProps } from '../../host/plugins/views'
  import { widgetBoxOf } from '../../lib/widget'
  import CommitRow from './CommitRow.svelte'
  import GithubCard from './GithubCard.svelte'
  import RepoHeading from './RepoHeading.svelte'
  import Reveal from './Reveal.svelte'
  import Sparkline from './Sparkline.svelte'
  import TickingNumber from './TickingNumber.svelte'
  import { Clock } from './clock.svelte'
  import { relativeTime, repoNameOf, reposOf } from './lib'
  import type { RepoEntry, ReposState } from './model'

  // The repository-activity card in the three widget sizes:
  //
  //   small (2x2)   one repository: the week's commits, a fortnight of bars and
  //                 the latest commit
  //   medium (4x2)  the same repository with its three latest commits beside
  //   large (4x4)   up to three repositories, each with its bars and commits
  //
  // Small and medium show one repository at a time; the header's arrows move
  // between the ones configured.

  const SMALL_BAR_AREA_PX = 30
  const MEDIUM_BAR_AREA_PX = 44
  const LARGE_BAR_AREA_PX = 22
  const MEDIUM_COMMITS = 3
  const LARGE_REPOS = 3
  // What the large card has room for: the commits each repository gets
  // shrink as more repositories share the card.
  const LARGE_COMMITS_BY_REPOS = [8, 8, 4, 2]
  const ROW_STAGGER_MS = 70

  let { bus, args }: ViewProps = $props()

  let repos = $state<ReposState | null>(null)
  let selected = $state(0)
  const clock = new Clock()

  const box = $derived(widgetBoxOf(args))
  const status = $derived(statusOf(repos))
  const message = $derived(messageOf(repos))
  const entries = $derived(entriesOf(repos))
  const current = $derived(entries[Math.min(selected, entries.length - 1)])
  const title = $derived(titleOf(current, box.size))
  const largeCommits = $derived(LARGE_COMMITS_BY_REPOS[Math.min(entries.length, LARGE_REPOS)])

  $effect(() => clock.connect())
  $effect(() =>
    subscribeTo(bus, 'github.repos', (incoming) => {
      repos = reposOf(incoming.data)
    }),
  )

  function statusOf(state: ReposState | null): string {
    if (state === null) {
      return 'loading'
    }
    return state.status
  }

  function messageOf(state: ReposState | null): string {
    if (state === null) {
      return ''
    }
    return state.message
  }

  function entriesOf(state: ReposState | null): RepoEntry[] {
    if (state === null) {
      return []
    }
    return state.repos
  }

  function titleOf(entry: RepoEntry | undefined, size: string): string {
    if (entry === undefined || size === 'large') {
      return 'Repository activity'
    }
    if (size === 'small') {
      return repoNameOf(entry.fullName)
    }
    return entry.fullName
  }

  function step(direction: number): void {
    selected = (selected + direction + entries.length) % entries.length
  }
</script>

{#snippet pager()}
  {#if entries.length > 1 && box.size !== 'large'}
    <gtkbox orientation="horizontal" spacing={0} valign="center">
      <gtkbutton class="card-gear" frame={false} icon="go-previous-symbolic" onclicked={() => step(-1)}></gtkbutton>
      <gtklabel class="card-hint" tabular valign="center">
        {Math.min(selected, entries.length - 1) + 1}/{entries.length}
      </gtklabel>
      <gtkbutton class="card-gear" frame={false} icon="go-next-symbolic" onclicked={() => step(1)}></gtkbutton>
    </gtkbox>
  {/if}
{/snippet}

<GithubCard
  {bus}
  {title}
  icon="folder-symbolic"
  {status}
  {message}
  compact={box.size === 'small'}
  trailing={pager}
>
  {#if current === undefined}
    <gtkbox orientation="vertical" spacing={4} valign="center" halign="center" vexpand>
      <gtklabel class="card-title" halign="center">No repositories</gtklabel>
      <gtklabel class="card-hint" halign="center" wrap justify="center">
        Pick some in Settings → GitHub.
      </gtklabel>
    </gtkbox>
  {:else if box.size === 'small'}
    {#key current.fullName}
      <gtkbox orientation="vertical" vexpand>
        <TickingNumber class="card-reading compact" value={current.weekCommits} />
        <gtklabel class="card-hint" halign="start">commits this week</gtklabel>
        <gtkbox vexpand></gtkbox>
        <Sparkline counts={current.dailyCounts} areaHeight={SMALL_BAR_AREA_PX} barWidth={8} />
        {#if current.commits.length > 0}
          <gtklabel class="card-body" halign="start" ellipsize="end" margin-top={8}>
            {current.commits[0].message}
          </gtklabel>
          <gtklabel class="card-hint" halign="start" ellipsize="end">
            {current.commits[0].author} · {relativeTime(current.commits[0].date, clock.now)}
          </gtklabel>
        {/if}
      </gtkbox>
    {/key}
  {:else if box.size === 'medium'}
    {#key current.fullName}
      <gtkbox orientation="horizontal" spacing={16} vexpand>
        <gtkbox orientation="vertical" width={140}>
          <TickingNumber class="card-reading compact" value={current.weekCommits} />
          <gtklabel class="card-hint" halign="start">commits this week</gtklabel>
          <gtkbox vexpand></gtkbox>
          <Sparkline counts={current.dailyCounts} areaHeight={MEDIUM_BAR_AREA_PX} barWidth={5} />
        </gtkbox>
        <gtkbox orientation="vertical" spacing={2} hexpand valign="start">
          {#each current.commits.slice(0, MEDIUM_COMMITS) as commit, index (commit.sha)}
            <Reveal delay={index * ROW_STAGGER_MS}>
              <CommitRow {commit} now={clock.now} />
            </Reveal>
          {/each}
        </gtkbox>
      </gtkbox>
    {/key}
  {:else}
    <gtkscrolledwindow vexpand hscroll="never" propagate-height={false}>
      <gtkbox orientation="vertical" spacing={14}>
        {#each entries.slice(0, LARGE_REPOS) as repo, repoIndex (repo.fullName)}
          <Reveal delay={repoIndex * 3 * ROW_STAGGER_MS}>
            <gtkbox orientation="vertical" spacing={6}>
              <RepoHeading {repo} />
              <Sparkline counts={repo.dailyCounts} areaHeight={LARGE_BAR_AREA_PX} barWidth={10} />
              <gtkbox orientation="vertical" spacing={2}>
                {#each repo.commits.slice(0, largeCommits) as commit (commit.sha)}
                  <CommitRow {commit} now={clock.now} />
                {/each}
              </gtkbox>
            </gtkbox>
          </Reveal>
        {/each}
      </gtkbox>
    </gtkscrolledwindow>
  {/if}
</GithubCard>
