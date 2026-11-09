import GLib from 'gi://GLib'

// The command line a client runs under. With bubblewrap installed the runner
// gets no network, no home folder, no Wayland or D-Bus socket, no other
// process to see, and only /usr read-only besides its own binary and bundle;
// it dies with the shell. Without bubblewrap it runs bare, with a warning:
// the shell still survives it, but nothing stops it reading files.

export interface RunnerLimits {
  memoryMb: number
  turnMs: number
}

export const DEFAULT_RUNNER_LIMITS: RunnerLimits = { memoryMb: 64, turnMs: 500 }

let warnedUnsandboxed = false

export function clientArgv(runner: string, bundle: string, limits: RunnerLimits): string[] {
  const runnerArgs = ['--memory-mb', String(limits.memoryMb), '--turn-ms', String(limits.turnMs)]
  const bubblewrap = GLib.find_program_in_path('bwrap')
  if (bubblewrap === null) {
    warnUnsandboxed()
    return [runner, bundle, ...runnerArgs]
  }
  return [
    bubblewrap,
    '--unshare-all',
    '--die-with-parent',
    '--new-session',
    '--clearenv',
    '--ro-bind', '/usr', '/usr',
    '--symlink', 'usr/lib', '/lib',
    '--symlink', 'usr/lib64', '/lib64',
    '--symlink', 'usr/bin', '/bin',
    '--proc', '/proc',
    '--dev', '/dev',
    '--tmpfs', '/tmp',
    '--ro-bind', runner, '/client/runner',
    '--ro-bind', bundle, '/client/bundle.js',
    '/client/runner', '/client/bundle.js', ...runnerArgs,
  ]
}

function warnUnsandboxed(): void {
  if (warnedUnsandboxed) {
    return
  }
  warnedUnsandboxed = true
  console.warn('clients: bwrap is not installed, so clients run without a sandbox')
}
