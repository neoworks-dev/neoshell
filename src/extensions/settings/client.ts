import { startShellClient } from '../../clients/runtime.js'
import DisplaysSettings from './DisplaysSettings.svelte'

// The Displays page. The Settings window around it is the host's: it is a
// window of its own, which a client may not open.

startShellClient({ displays: DisplaysSettings })
