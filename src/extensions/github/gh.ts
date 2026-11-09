import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import { classifyFailure, parseJson } from './model.js'
import type { Failure } from './model.js'

// Runs `gh` and parses its JSON. gh carries the user's authentication itself,
// so the shell never sees a token.

const TIMEOUT_SECONDS = 30

export type GhResult = { ok: true; data: unknown } | { ok: false; failure: Failure }

export async function ghApi(args: string[]): Promise<GhResult> {
  const outcome = await runGh(['gh', 'api', ...args])
  if (!outcome.ok) {
    return { ok: false, failure: classifyFailure(outcome.stderr) }
  }
  const data = parseJson(outcome.stdout)
  if (data === null) {
    return { ok: false, failure: { status: 'error', message: 'gh answered with something other than JSON.' } }
  }
  return { ok: true, data }
}

/** Runs a gh api call whose reply is empty, such as marking a thread read. */
export async function ghApiSucceeds(args: string[]): Promise<boolean> {
  const outcome = await runGh(['gh', 'api', ...args])
  return outcome.ok
}

interface Outcome {
  ok: boolean
  stdout: string
  stderr: string
}

function runGh(command: string[]): Promise<Outcome> {
  let child: Gio.Subprocess
  try {
    child = Gio.Subprocess.new(command, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE)
  } catch {
    return Promise.resolve({ ok: false, stdout: '', stderr: 'gh unavailable' })
  }
  const cancellable = new Gio.Cancellable()
  let timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, TIMEOUT_SECONDS, () => {
    timer = 0
    cancellable.cancel()
    child.force_exit()
    return GLib.SOURCE_REMOVE
  })
  return new Promise((resolve) => {
    child.communicate_utf8_async(null, cancellable, (process, result) => {
      if (timer !== 0) {
        GLib.source_remove(timer)
      }
      resolve(finish(child, process, result))
    })
  })
}

function finish(child: Gio.Subprocess, process: Gio.Subprocess | null, result: Gio.AsyncResult): Outcome {
  if (process === null) {
    return { ok: false, stdout: '', stderr: 'gh stopped unexpectedly' }
  }
  try {
    const [, stdout, stderr] = process.communicate_utf8_finish(result)
    return { ok: child.get_successful(), stdout: trimmed(stdout), stderr: trimmed(stderr) }
  } catch {
    return { ok: false, stdout: '', stderr: 'gh did not answer in time' }
  }
}

function trimmed(text: string | null): string {
  if (text === null) {
    return ''
  }
  return text.trim()
}
