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
  const monitor = monitorEntryOf(monitors, connector)
  const { width, height } = monitor
  if (typeof width !== 'number' || typeof height !== 'number') {
    return null
  }
  return { width, height }
}

// The size a surface on that monitor is laid out in. hypr.monitors gives the
// mode in physical pixels; a layer surface gets them divided by the scale, and
// on its side when the monitor is rotated.
export function logicalMonitorSizeOf(monitors: unknown, connector: string): MonitorSize | null {
  const size = monitorSizeOf(monitors, connector)
  if (size === null) {
    return null
  }
  const monitor = monitorEntryOf(monitors, connector)
  const scale = positiveOr(monitor.scale, 1)
  const width = Math.round(size.width / scale)
  const height = Math.round(size.height / scale)
  if (isQuarterTurn(monitor.transform)) {
    return { width: height, height: width }
  }
  return { width, height }
}

// Whether `connector` picks out its monitor rather than falling back to the
// first one: a window not yet placed on a monitor has '', which only names
// one when there is just the one.
export function namesMonitor(monitors: unknown, connector: string): boolean {
  if (!Array.isArray(monitors)) {
    return false
  }
  if (connector === '') {
    return monitors.length === 1
  }
  return monitors.some((entry) => recordOf(entry).name === connector)
}

function monitorEntryOf(monitors: unknown, connector: string): Record<string, unknown> {
  if (!Array.isArray(monitors) || monitors.length === 0) {
    return {}
  }
  const monitor: unknown = monitors.find((entry) => recordOf(entry).name === connector)
  if (monitor === undefined) {
    return recordOf(monitors[0])
  }
  return recordOf(monitor)
}

// Wayland's transforms 1, 3, 5 and 7 turn the output by 90 or 270 degrees.
function isQuarterTurn(transform: unknown): boolean {
  return typeof transform === 'number' && transform % 2 === 1
}

function positiveOr(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || value <= 0) {
    return fallback
  }
  return value
}

function recordOf(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {}
  }
  return value as Record<string, unknown>
}
