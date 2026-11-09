import { startShellClient } from '../../../clients/runtime.js'
import WidgetGallery from '../WidgetGallery.svelte'

// The widget gallery. Its previews are the widgets' own views, embedded.

startShellClient({ gallery: WidgetGallery })
