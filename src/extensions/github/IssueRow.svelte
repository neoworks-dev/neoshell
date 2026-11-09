<script lang="ts">
  import { relativeTime } from './lib'
  import type { IssueEntry } from './model'

  // An open issue or pull request: what kind it is, its title, and where it
  // lives with how long ago it last moved.

  let { issue, now }: { issue: IssueEntry; now: number } = $props()

  const kindLabel = $derived(kindLabelOf(issue))
  const meta = $derived(`${issue.repo} #${issue.number} · ${issue.roles.join(' & ')} · ${relativeTime(issue.updatedAt, now)}`)

  function kindLabelOf(entry: IssueEntry): string {
    if (entry.isPullRequest) {
      return 'PR'
    }
    return 'Issue'
  }

  function chipClass(entry: IssueEntry): string {
    if (entry.isPullRequest) {
      return 'gh-chip gh-chip-pull'
    }
    return 'gh-chip gh-chip-issue'
  }
</script>

<gtkbox class="gh-row" orientation="horizontal" spacing={8} tooltip={issue.title}>
  <gtklabel class={chipClass(issue)} valign="center" halign="start" width={38}>{kindLabel}</gtklabel>
  <gtkbox orientation="vertical" hexpand halign="fill">
    <gtklabel class="card-body" halign="start" xalign={0} ellipsize="end">{issue.title}</gtklabel>
    <gtklabel class="card-hint" halign="start" xalign={0} ellipsize="end">{meta}</gtklabel>
  </gtkbox>
</gtkbox>
