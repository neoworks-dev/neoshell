import { startShellClient } from '../../clients/runtime.js'
import ControlCentre from './ControlCentre.svelte'
import ControlCentreIcon from './ControlCentreIcon.svelte'

startShellClient({ icon: ControlCentreIcon, menu: ControlCentre })
