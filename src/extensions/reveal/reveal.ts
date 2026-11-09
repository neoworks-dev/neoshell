import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record.js'

// Showing the desktop: the windows on the focused monitor's workspace move to
// a special workspace, which Hyprland keeps off screen, and move back to
// where they were when the desktop is let go. Everything here is pure; the
// backend runs the dispatches it returns.

export const HIDDEN_WORKSPACE = 'special:neoshell-desktop'

export interface WindowToHide {
  address: string
  title: string
  appClass: string
}

export interface Dispatch {
  dispatcher: string
  arg: string
}

export interface ActiveWorkspace {
  id: number
  monitor: string
}

/** The workspace showing on the focused monitor, from hypr.monitors. */
export function focusedWorkspace(monitors: unknown): ActiveWorkspace | null {
  const focused = arrayOf(monitors).find((monitor) => monitor.focused === true)
  if (focused === undefined) {
    return null
  }
  const workspace = recordOf(focused.activeWorkspace)
  const id = numberOf(workspace.id, 0)
  if (id <= 0) {
    return null
  }
  return { id, monitor: stringOf(focused.name) }
}

/** The windows on `workspace` that showing the desktop moves away; pinned ones stay. */
export function windowsOn(windows: unknown, workspace: number): WindowToHide[] {
  return arrayOf(windows)
    .filter((window) => numberOf(recordOf(window.workspace).id, 0) === workspace && window.pinned !== true)
    .filter((window) => stringOf(window.address) !== '')
    .map((window) => ({
      address: stringOf(window.address),
      title: stringOf(window.title),
      appClass: stringOf(window.class),
    }))
}

export function hideDispatches(windows: WindowToHide[]): Dispatch[] {
  return windows.map((window) => ({
    dispatcher: 'movetoworkspacesilent',
    arg: `${HIDDEN_WORKSPACE},address:${window.address}`,
  }))
}

// The window asked for comes back last, so it ends up focused and on top.
export function restoreDispatches(addresses: string[], workspace: number, focus: string): Dispatch[] {
  const ordered = [...addresses.filter((address) => address !== focus), ...addresses.filter((address) => address === focus)]
  const moves = ordered.map((address) => ({
    dispatcher: 'movetoworkspacesilent',
    arg: `${workspace},address:${address}`,
  }))
  if (focus === '' || !addresses.includes(focus)) {
    return moves
  }
  return [...moves, { dispatcher: 'focuswindow', arg: `address:${focus}` }]
}

/** The hidden windows that still exist; one closed while hidden drops out. */
export function stillOpen(hidden: string[], windows: unknown): string[] {
  const open = new Set(arrayOf(windows).map((window) => stringOf(window.address)))
  return hidden.filter((address) => open.has(address))
}
