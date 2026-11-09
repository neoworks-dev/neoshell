<script lang="ts">
  import type { BusService } from '../../lib/bus'
  import Link from './Link.svelte'
  import { relativeTime } from './lib'
  import type { RepoCommit } from './model'

  // One commit: its short hash, the subject line and how long ago. Pressing it
  // opens the commit on GitHub.

  let { bus, commit, now }: { bus: BusService; commit: RepoCommit; now: number } = $props()
</script>

<Link {bus} url={commit.url} row>
  <gtkbox class="gh-commit" orientation="horizontal" spacing={8} tooltip="{commit.author}: {commit.message}">
    <gtklabel class="gh-sha" valign="center">{commit.sha}</gtklabel>
    <gtklabel class="card-body" hexpand halign="start" ellipsize="end" xalign={0}>
      {commit.message}
    </gtklabel>
    <gtklabel class="card-hint" valign="center">{relativeTime(commit.date, now)}</gtklabel>
  </gtkbox>
</Link>
