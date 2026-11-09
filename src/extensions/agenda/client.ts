import { startShellClient } from '../../clients/runtime.js'
import AgendaIcon from './AgendaIcon.svelte'
import AgendaMenu from './AgendaMenu.svelte'

startShellClient({ icon: AgendaIcon, menu: AgendaMenu })
