import { startShellClient } from '../../clients/runtime.js'
import Gallery from './Gallery.svelte'
import GallerySettings from './GallerySettings.svelte'

startShellClient({ card: Gallery, settings: GallerySettings })
