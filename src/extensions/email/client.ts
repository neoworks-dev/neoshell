import { startShellClient } from '../../clients/runtime.js'
import Email from './Email.svelte'
import EmailSettings from './EmailSettings.svelte'

startShellClient({ card: Email, settings: EmailSettings })
