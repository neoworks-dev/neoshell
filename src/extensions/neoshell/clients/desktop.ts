import { startShellClient } from '../../../clients/runtime.js'
import Desktop from '../Desktop.svelte'

// Every monitor's desktop runs in this one client.

startShellClient({ desktop: Desktop })
