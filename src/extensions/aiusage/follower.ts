import { grepLines, readAppended, yieldToMainLoop } from './logFiles.js'
import type { LogFile } from './logFiles.js'

// Follows a set of append-only logs: each is read whole once, through grep for
// the lines that carry `marker`, and from then on only what was appended.
// `ingest` gets each batch with the file it came from; `reset` is called when
// a file shrank, which means it was replaced and everything read from it is
// stale.

export class LogFollower {
  private readonly offsets = new Map<string, number>()
  private readonly marker: string
  private readonly ingest: (file: LogFile, lines: string[]) => void
  private readonly reset: (path: string) => void

  constructor(marker: string, ingest: (file: LogFile, lines: string[]) => void, reset: (path: string) => void) {
    this.marker = marker
    this.ingest = ingest
    this.reset = reset
  }

  async follow(files: LogFile[]): Promise<void> {
    this.forgetMissing(files)
    for (const file of files) {
      await this.followFile(file)
      await yieldToMainLoop()
    }
  }

  /** Forgets everything, so the next follow reads every file whole. */
  clear(): void {
    for (const path of this.offsets.keys()) {
      this.reset(path)
    }
    this.offsets.clear()
  }

  private async followFile(file: LogFile): Promise<void> {
    const offset = this.offsets.get(file.path)
    if (offset === undefined) {
      await this.readWhole(file)
      return
    }
    if (file.size < offset) {
      this.reset(file.path)
      await this.readWhole(file)
      return
    }
    if (file.size === offset) {
      return
    }
    const appended = readAppended(file.path, offset, file.size)
    this.offsets.set(file.path, appended.end)
    this.ingest(
      file,
      appended.lines.filter((line) => line.includes(this.marker)),
    )
  }

  private async readWhole(file: LogFile): Promise<void> {
    this.offsets.set(file.path, file.size)
    this.ingest(file, await grepLines(file.path, this.marker))
  }

  private forgetMissing(files: LogFile[]): void {
    const present = new Set(files.map((file) => file.path))
    for (const path of this.offsets.keys()) {
      if (!present.has(path)) {
        this.offsets.delete(path)
        this.reset(path)
      }
    }
  }
}
