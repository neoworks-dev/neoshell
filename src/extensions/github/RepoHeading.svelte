<script lang="ts">
  import { pluralize, repoNameOf, repoOwnerOf } from './lib'
  import type { RepoEntry } from './model'

  // A repository's name over its stars and the week's commits.

  let { repo }: { repo: RepoEntry } = $props()
</script>

<gtkbox orientation="horizontal" spacing={10}>
  <gtkbox orientation="horizontal" spacing={0} hexpand halign="start">
    <gtklabel class="card-hint" ellipsize="end">{repoOwnerOf(repo.fullName)}/</gtklabel>
    <gtklabel class="gh-repo-name" ellipsize="end">{repoNameOf(repo.fullName)}</gtklabel>
  </gtkbox>
  <gtkbox orientation="horizontal" spacing={3} valign="center" tooltip="Stars">
    <gtkicon class="gh-star" icon="starred-symbolic" size={12}></gtkicon>
    <gtklabel class="card-hint" tabular>{repo.stars}</gtklabel>
  </gtkbox>
  <gtklabel class="card-hint" tabular>{pluralize(repo.weekCommits, 'commit')} this week</gtklabel>
</gtkbox>
