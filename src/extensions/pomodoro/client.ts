import { startShellClient } from '../../clients/runtime.js'
import PomodoroIcon from './PomodoroIcon.svelte'
import PomodoroMenu from './PomodoroMenu.svelte'
import PomodoroSettings from './PomodoroSettings.svelte'

startShellClient({ icon: PomodoroIcon, menu: PomodoroMenu, settings: PomodoroSettings })
