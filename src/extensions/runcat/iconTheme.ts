import Gdk from 'gi://Gdk?version=4.0'
import GLib from 'gi://GLib'
import Gtk from 'gi://Gtk?version=4.0'

// The cat's frames are themed icons from assets/runcat; the client only names
// them, so the folder has to be on the host's icon theme search path.

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
