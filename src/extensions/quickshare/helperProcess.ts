import Gio from 'gi://Gio'
import GLib from 'gi://GLib'

// The Quick Share helper as a child process: commands go to its stdin and its
// stdout is read line by line. Its stderr (rqs_lib's logging) is dropped.
// Closing stdin is how it is told to stop; it exits on its own after that.

export interface HelperProcess {
  send(command: Record<string, unknown>): void
  stop(): void
}

const encoder = new TextEncoder()

export function startHelper(
  argv: string[],
  onLine: (line: string) => void,
  onExit: () => void,
): HelperProcess | null {
  let child: Gio.Subprocess
  try {
    const flags = Gio.SubprocessFlags.STDIN_PIPE | Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
    child = Gio.Subprocess.new(argv, flags)
  } catch (error) {
    console.error(`quickshare: cannot start ${argv[0]}:`, error)
    return null
  }
  const stdin = child.get_stdin_pipe() as Gio.OutputStream
  const stdout = new Gio.DataInputStream({ base_stream: child.get_stdout_pipe() as Gio.InputStream })
  const state = { stopped: false }
  readLines(stdout, state, onLine, onExit)
  return {
    send(command) {
      writeLine(stdin, command)
    },
    stop() {
      state.stopped = true
      closeQuietly(stdin)
    },
  }
}

// One short line on a pipe the helper drains continuously; a synchronous write
// keeps commands in order without a queue of pending async writes.
function writeLine(stdin: Gio.OutputStream, command: Record<string, unknown>): void {
  try {
    stdin.write_all(encoder.encode(`${JSON.stringify(command)}\n`), null)
  } catch (error) {
    console.error('quickshare: cannot write to the helper:', error)
  }
}

function readLines(
  stream: Gio.DataInputStream,
  state: { stopped: boolean },
  onLine: (line: string) => void,
  onExit: () => void,
): void {
  stream.read_line_async(GLib.PRIORITY_DEFAULT, null, (_stream, result) => {
    const line = finishLine(stream, result)
    if (line === null) {
      if (!state.stopped) {
        onExit()
      }
      return
    }
    onLine(line)
    readLines(stream, state, onLine, onExit)
  })
}

function finishLine(stream: Gio.DataInputStream, result: Gio.AsyncResult): string | null {
  try {
    const [bytes] = stream.read_line_finish_utf8(result)
    return bytes
  } catch {
    return null
  }
}

function closeQuietly(stream: Gio.OutputStream): void {
  try {
    stream.close(null)
  } catch {
    // Already closed: the helper is gone either way.
  }
}
