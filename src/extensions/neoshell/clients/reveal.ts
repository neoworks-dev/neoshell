import { startShellClient } from '../../../clients/runtime.js'
import HotCorner from '../HotCorner.svelte'
import RevealStrip from '../RevealStrip.svelte'

startShellClient({ strip: RevealStrip, corner: HotCorner })
