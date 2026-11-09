import { startShellClient } from '../../clients/runtime.js'
import AiUsage from './AiUsage.svelte'
import AiUsageSettings from './AiUsageSettings.svelte'

startShellClient({ card: AiUsage, settings: AiUsageSettings })
