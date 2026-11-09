import Gdk from 'gi://Gdk?version=4.0'
import GLib from 'gi://GLib'
import Gtk from 'gi://Gtk?version=4.0'

// The running cat's frames: symbolic SVGs under assets/runcat, found through
// the icon theme's search path so GTK recolours them to the bar's text colour.

export const FRAME_COUNT = 5

const SLOWEST_FRAME_MS = 200
const FASTEST_FRAME_MS = 40

let searchPathAdded = false

export function addFrameSearchPath(): void {
  if (searchPathAdded) {
    return
  }
  searchPathAdded = true
  const display = Gdk.Display.get_default()
  if (display === null) {
    return
  }
  const directory = GLib.build_filenamev([GLib.get_current_dir(), 'assets', 'runcat'])
  Gtk.IconTheme.get_for_display(display).add_search_path(directory)
}

export function frameIconName(index: number): string {
  return `runcat-${index + 1}-symbolic`
}

// 200 ms a frame at 0% CPU, down to 40 ms at 100%.
export function frameIntervalMs(percent: number): number {
  const clamped = Math.min(100, Math.max(0, percent))
  return Math.round(SLOWEST_FRAME_MS - ((SLOWEST_FRAME_MS - FASTEST_FRAME_MS) * clamped) / 100)
}
