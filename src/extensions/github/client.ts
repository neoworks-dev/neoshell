import { startShellClient } from '../../clients/runtime.js'
import Contributions from './Contributions.svelte'
import GithubSettings from './GithubSettings.svelte'
import Issues from './Issues.svelte'
import Repos from './Repos.svelte'

startShellClient({ contributions: Contributions, repos: Repos, issues: Issues, settings: GithubSettings })
