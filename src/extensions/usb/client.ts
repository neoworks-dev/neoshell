import { startShellClient } from '../../clients/runtime.js'
import UsbIcon from './UsbIcon.svelte'
import UsbMenu from './UsbMenu.svelte'

startShellClient({ icon: UsbIcon, menu: UsbMenu })
