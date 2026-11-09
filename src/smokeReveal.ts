import { focusedWorkspace, hideDispatches, restoreDispatches, stillOpen, windowsOn } from './extensions/reveal/reveal'

// Showing the desktop, checked on plain values: only the focused workspace's
// unpinned windows go, and they come back to it with the asked-for one last
// and focused.

const MONITORS = [
  { name: 'DP-1', focused: false, activeWorkspace: { id: 2 } },
  { name: 'DP-2', focused: true, activeWorkspace: { id: 5 } },
]

const WINDOWS = [
  { address: '0xa', workspace: { id: 5 }, title: 'Editor', class: 'code' },
  { address: '0xb', workspace: { id: 5 }, title: 'Terminal', class: 'kitty' },
  { address: '0xc', workspace: { id: 5 }, title: 'Pinned', class: 'pip', pinned: true },
  { address: '0xd', workspace: { id: 2 }, title: 'Elsewhere', class: 'firefox' },
]

export function revealFailure(): string | null {
  const workspace = focusedWorkspace(MONITORS)
  if (workspace === null || workspace.id !== 5 || workspace.monitor !== 'DP-2') {
    return 'showing the desktop did not pick the focused monitor\'s workspace'
  }
  const windows = windowsOn(WINDOWS, workspace.id)
  if (windows.map((window) => window.address).join() !== '0xa,0xb') {
    return 'showing the desktop would move a pinned window or one on another workspace'
  }
  const hidden = hideDispatches(windows).map((dispatch) => dispatch.arg)
  if (hidden.join() !== 'special:neoshell-desktop,address:0xa,special:neoshell-desktop,address:0xb') {
    return 'hidden windows do not go to the desktop\'s special workspace'
  }
  const restored = restoreDispatches(['0xa', '0xb'], 5, '0xa').map((dispatch) => `${dispatch.dispatcher} ${dispatch.arg}`)
  const expected = ['movetoworkspacesilent 5,address:0xb', 'movetoworkspacesilent 5,address:0xa', 'focuswindow address:0xa']
  if (restored.join('|') !== expected.join('|')) {
    return 'restored windows do not come back with the clicked one in front'
  }
  if (stillOpen(['0xa', '0xz'], WINDOWS).join() !== '0xa') {
    return 'a window closed while hidden stays in the strip'
  }
  return null
}
