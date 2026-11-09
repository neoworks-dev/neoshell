import { startShellClient } from '../../clients/runtime.js'
import RunCatIcon from './RunCatIcon.svelte'
import RunCatMenu from './RunCatMenu.svelte'

startShellClient({ icon: RunCatIcon, menu: RunCatMenu })
