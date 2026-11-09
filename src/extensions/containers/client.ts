import { startShellClient } from '../../clients/runtime.js'
import Containers from './Containers.svelte'
import ContainersSettings from './ContainersSettings.svelte'

startShellClient({ card: Containers, settings: ContainersSettings })
