// Which monitors a surface's window goes on. Config's "displays" section names
// the main display and places each top-level view-tree node by id:
//
//   "displays": {"main": "DP-2", "surfaces": {"desktop": "all", "dock": "HDMI-A-1"}}
//
// A placement is "all", "main" or a connector name. Without one a node's own
// args.monitors decides, and without that it goes on the main display. A
// connector that is not plugged in falls back to the main display, so
// unplugging a monitor never loses a surface.

export const DISPLAYS_KEY = 'displays'
export const EVERY_DISPLAY = 'all'
export const MAIN_DISPLAY = 'main'

export function mainConnectorOf(section: Record<string, unknown>, connectors: string[]): string {
  const configured = section.main
  if (typeof configured === 'string' && connectors.includes(configured)) {
    return configured
  }
  if (connectors.length === 0) {
    return ''
  }
  return connectors[0]
}

export function placementOf(
  section: Record<string, unknown>,
  nodeId: string,
  args: Record<string, unknown>,
): string {
  const surfaces = section.surfaces
  if (typeof surfaces === 'object' && surfaces !== null) {
    const configured = (surfaces as Record<string, unknown>)[nodeId]
    if (typeof configured === 'string' && configured !== '') {
      return configured
    }
  }
  if (typeof args.monitors === 'string' && args.monitors !== '') {
    return args.monitors
  }
  return MAIN_DISPLAY
}

// An empty list of connectors means GDK has not reported any monitors yet; the
// one '' entry then puts the window wherever the compositor chooses.
export function connectorsFor(placement: string, connectors: string[], main: string): string[] {
  if (connectors.length === 0) {
    return ['']
  }
  if (placement === EVERY_DISPLAY) {
    return connectors
  }
  if (connectors.includes(placement)) {
    return [placement]
  }
  return [main]
}

export interface MonitorSize {
  width: number
  height: number
}

// The size of the monitor named `connector` in the compositor's monitor list
// (hypr.monitors), or of the first one when it is not there.
export function monitorSizeOf(monitors: unknown, connector: string): MonitorSize | null {
  if (!Array.isArray(monitors) || monitors.length === 0) {
    return null
  }
  let monitor: unknown = monitors.find((entry) => recordOf(entry).name === connector)
  if (monitor === undefined) {
    monitor = monitors[0]
  }
  const { width, height } = recordOf(monitor)
  if (typeof width !== 'number' || typeof height !== 'number') {
    return null
  }
  return { width, height }
}

function recordOf(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {}
  }
  return value as Record<string, unknown>
}
