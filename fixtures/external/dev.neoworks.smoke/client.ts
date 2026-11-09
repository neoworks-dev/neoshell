import { startExtensionClient } from '../../../sdk/index.js'
import Card from './Card.svelte'

startExtensionClient('dev.neoworks.smoke', { card: Card })
