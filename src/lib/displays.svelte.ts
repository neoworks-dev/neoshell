import Gdk from 'gi://Gdk?version=4.0'
import type Gio from 'gi://Gio'

// The connected monitors as GDK reports them, held reactively: plugging one
// in or out changes `list`, and everything placed by connector follows.

export interface Display {
  // The output's name, "DP-2"; what config places surfaces by.
  connector: string
  // Make and model, for people.
  description: string
  monitor: Gdk.Monitor
}

export class Displays {
  list = $state.raw<Display[]>([])

  connect(): () => void {
    const display = Gdk.Display.get_default()
    if (display === null) {
      return () => {}
    }
    const model = display.get_monitors()
    const refresh = () => {
      this.list = displaysOf(model)
    }
    refresh()
    const handler = model.connect('items-changed', refresh)
    return () => model.disconnect(handler)
  }

  connectors(): string[] {
    return this.list.map((entry) => entry.connector)
  }

  monitorFor(connector: string): Gdk.Monitor | null {
    const found = this.list.find((entry) => entry.connector === connector)
    if (found === undefined) {
      return null
    }
    return found.monitor
  }
}

function displaysOf(model: Gio.ListModel): Display[] {
  const displays: Display[] = []
  for (let position = 0; position < model.get_n_items(); position += 1) {
    const monitor = model.get_item(position) as Gdk.Monitor
    const connector = monitor.get_connector()
    if (connector !== null) {
      displays.push({ connector, description: descriptionOf(monitor), monitor })
    }
  }
  return displays
}

function descriptionOf(monitor: Gdk.Monitor): string {
  const description = monitor.get_description()
  if (description !== null && description !== '') {
    return description
  }
  const parts = [monitor.get_manufacturer(), monitor.get_model()].filter(
    (part): part is string => part !== null && part !== '',
  )
  return parts.join(' ')
}
