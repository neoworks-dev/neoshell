import { startShellClient } from '../../../clients/runtime.js'
import Notch from '../Notch.svelte'
import NookMedia from '../NookMedia.svelte'
import NookCalendar from '../NookCalendar.svelte'

// The notch, and the two Nook widgets it ships with. The notch embeds every
// Nook widget, its own included, so one from another extension sits in the
// row the same way.

startShellClient({ notch: Notch, nookMedia: NookMedia, nookCalendar: NookCalendar })
