import { startShellClient } from '../../../clients/runtime.js'
import Topbar from '../Topbar.svelte'
import Clock from '../Clock.svelte'
import Battery from '../Battery.svelte'

// The bar, and the two status items it ships with. Every other item's icon
// is embedded from its own client.

startShellClient({ topbar: Topbar, clock: Clock, battery: Battery })
