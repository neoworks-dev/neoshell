import { startShellClient } from '../../../clients/runtime.js'
import NotchSettings from '../NotchSettings.svelte'

// Settings → Notch, apart from the notch's own client so it holds only the
// config keys it writes.

startShellClient({ notch: NotchSettings })
