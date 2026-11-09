import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import { run } from '../../gjs/proc.js'

// Reading the agents' session logs. They are append-only JSON lines and a busy
// one runs to tens of megabytes, mostly tool output, so a file is read once by
// grep for just the lines that carry usage (native, and the big lines that do
// not match never reach JavaScript), and after that only what was appended.

export interface LogFile {
  path: string
  size: number
  // ms since the epoch
  modified: number
}

const MAX_DEPTH = 5
const MAX_FILES = 3000
const MAX_APPEND_BYTES = 8 * 1024 * 1024
const NEWLINE = 10
const LIST_ATTRIBUTES = 'standard::name,standard::type,standard::size,time::modified'
const SECONDS_TO_MS = 1000

const decoder = new TextDecoder()

/** The .jsonl files under `root` changed since `since` (ms), whichever directory they sit in. */
export function listLogFiles(root: string, since: number): LogFile[] {
  const files: LogFile[] = []
  walk(root, 0, since, files)
  return files
}

/** One file's size and modification time, or null when it is not there. */
export function statLogFile(path: string): LogFile | null {
  try {
    const info = Gio.File.new_for_path(path).query_info(
      'standard::size,time::modified',
      Gio.FileQueryInfoFlags.NONE,
      null,
    )
    return { path, size: info.get_size(), modified: info.get_attribute_uint64('time::modified') * SECONDS_TO_MS }
  } catch {
    return null
  }
}

export function directoryExists(path: string): boolean {
  return GLib.file_test(path, GLib.FileTest.IS_DIR)
}

function walk(directory: string, depth: number, since: number, files: LogFile[]): void {
  const enumerator = openEnumerator(directory)
  if (enumerator === null) {
    return
  }
  for (;;) {
    const info = enumerator.next_file(null)
    if (info === null || files.length >= MAX_FILES) {
      break
    }
    visit(directory, info, depth, since, files)
  }
  enumerator.close(null)
}

function visit(directory: string, info: Gio.FileInfo, depth: number, since: number, files: LogFile[]): void {
  const name = info.get_name()
  const path = `${directory}/${name}`
  if (info.get_file_type() === Gio.FileType.DIRECTORY) {
    if (depth < MAX_DEPTH) {
      walk(path, depth + 1, since, files)
    }
    return
  }
  const modified = info.get_attribute_uint64('time::modified') * SECONDS_TO_MS
  if (name.endsWith('.jsonl') && modified >= since) {
    files.push({ path, size: info.get_size(), modified })
  }
}

function openEnumerator(directory: string): Gio.FileEnumerator | null {
  try {
    return Gio.File.new_for_path(directory).enumerate_children(LIST_ATTRIBUTES, Gio.FileQueryInfoFlags.NONE, null)
  } catch {
    return null
  }
}

/** Every line of the file containing `marker`, found by grep. */
export async function grepLines(path: string, marker: string): Promise<string[]> {
  const result = await run(['grep', '-a', '-h', '-F', marker, path])
  if (result.stdout === '') {
    return []
  }
  return result.stdout.split('\n')
}

export interface Appended {
  lines: string[]
  // Where the next read starts: after the last complete line read.
  end: number
}

/** The complete lines written to the file between `from` and `to`; a half-written last line waits for the next read. */
export function readAppended(path: string, from: number, to: number): Appended {
  const bytes = readBytes(path, from, Math.min(to - from, MAX_APPEND_BYTES))
  const lastNewline = bytes.lastIndexOf(NEWLINE)
  if (lastNewline < 0) {
    return { lines: [], end: from }
  }
  const text = decoder.decode(bytes.subarray(0, lastNewline))
  return { lines: text.split('\n'), end: from + lastNewline + 1 }
}

/** The complete lines in the last `length` bytes of the file. */
export function readTail(path: string, size: number, length: number): string[] {
  const from = Math.max(0, size - length)
  const bytes = readBytes(path, from, size - from)
  const text = decoder.decode(bytes)
  const lines = text.split('\n')
  if (from > 0) {
    lines.shift()
  }
  return lines
}

function readBytes(path: string, from: number, length: number): Uint8Array {
  try {
    const stream = Gio.File.new_for_path(path).read(null)
    stream.seek(from, GLib.SeekType.SET, null)
    const bytes = stream.read_bytes(length, null).toArray()
    stream.close(null)
    return bytes
  } catch (error) {
    console.error(`aiusage: cannot read ${path}:`, error)
    return new Uint8Array()
  }
}

/** Gives the main loop a turn, so a long scan does not stall the shell. */
export function yieldToMainLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}
