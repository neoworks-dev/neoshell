<script lang="ts">
  import { relativeTime } from './lib'
  import type { RepoCommit } from './model'

  // One commit: its short hash, the subject line and how long ago.

  let { commit, now }: { commit: RepoCommit; now: number } = $props()
</script>

<gtkbox class="gh-commit" orientation="horizontal" spacing={8} tooltip="{commit.author}: {commit.message}">
  <gtklabel class="gh-sha" valign="center">{commit.sha}</gtklabel>
  <gtklabel class="gh-commit-subject" hexpand halign="start" ellipsize="end" xalign={0}>
    {commit.message}
  </gtklabel>
  <gtklabel class="card-hint" valign="center">{relativeTime(commit.date, now)}</gtklabel>
</gtkbox>
