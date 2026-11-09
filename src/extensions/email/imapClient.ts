import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import type { Account } from './accounts.js'
import { headersOf, newestUidsOf, quotedOf, readUntilTagged, searchResultOf } from './imapParse.js'
import type { Header, LineSource, TaggedResult } from './imapParse.js'

// Reading one inbox over IMAP: connect, sign in, ask which messages are
// unread, fetch the headers of the newest few, sign out. The mailbox is only
// ever examined, never selected for writing, and the headers are fetched with
// BODY.PEEK, so nothing is marked read. A fresh connection per check keeps it
// simple and robust: no IDLE, no state to lose when the network drops.

export interface InboxReading {
  unread: number
  headers: Header[]
}

const CONNECT_TIMEOUT_SECONDS = 25
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8')

export async function readInbox(account: Account, password: string, latest: number): Promise<InboxReading> {
  const cancellable = new Gio.Cancellable()
  const timer = setTimeout(() => cancellable.cancel(), CONNECT_TIMEOUT_SECONDS * 1000)
  let session: ImapSession | null = null
  try {
    session = new ImapSession(await connect(account, cancellable), cancellable)
    return await readFrom(session, account, password, latest)
  } finally {
    clearTimeout(timer)
    if (session !== null) {
      session.close()
    }
  }
}

async function readFrom(
  session: ImapSession,
  account: Account,
  password: string,
  latest: number,
): Promise<InboxReading> {
  await session.expectGreeting()
  await session.login(account.user, password)
  await session.ok('EXAMINE INBOX')
  const search = await session.ok('UID SEARCH UNSEEN')
  const unseen = searchResultOf(search.responses)
  const uids = newestUidsOf(unseen, latest)
  if (uids.length === 0) {
    await session.logout()
    return { unread: 0, headers: [] }
  }
  const fetched = await session.ok(`UID FETCH ${uids.join(',')} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])`)
  await session.logout()
  return { unread: unseen.length, headers: headersOf(fetched.responses) }
}

function connect(account: Account, cancellable: Gio.Cancellable): Promise<Gio.SocketConnection> {
  const client = new Gio.SocketClient()
  client.set_tls(account.security === 'tls')
  return new Promise((resolve, reject) => {
    client.connect_to_host_async(`${account.host}:${account.port}`, account.port, cancellable, (_source, result) => {
      try {
        resolve(client.connect_to_host_finish(result))
      } catch (error) {
        reject(friendlyError(error))
      }
    })
  })
}

class ImapSession implements LineSource {
  private readonly connection: Gio.SocketConnection
  private readonly input: Gio.DataInputStream
  private readonly output: Gio.OutputStream
  private readonly cancellable: Gio.Cancellable
  private tagCounter = 0

  constructor(connection: Gio.SocketConnection, cancellable: Gio.Cancellable) {
    this.connection = connection
    this.cancellable = cancellable
    this.input = new Gio.DataInputStream({
      base_stream: connection.get_input_stream(),
      newline_type: Gio.DataStreamNewlineType.CR_LF,
    })
    this.output = connection.get_output_stream()
  }

  close(): void {
    try {
      this.connection.close(null)
    } catch {
      // already gone
    }
  }

  async expectGreeting(): Promise<void> {
    const greeting = await this.readLine()
    if (greeting === null || !/^\* (OK|PREAUTH)\b/.test(greeting)) {
      throw new Error('That is not an IMAP server.')
    }
  }

  async login(user: string, password: string): Promise<void> {
    const quotedUser = quotedOf(user)
    const quotedPassword = quotedOf(password)
    if (quotedUser === null || quotedPassword === null) {
      throw new Error('The user name or password has a character IMAP cannot carry.')
    }
    const result = await this.command(`LOGIN ${quotedUser} ${quotedPassword}`)
    if (result.status !== 'OK') {
      throw new Error(loginFailureOf(result.text))
    }
  }

  async logout(): Promise<void> {
    try {
      await this.command('LOGOUT')
    } catch {
      // the server may hang up before it answers; the check is done either way
    }
  }

  async ok(command: string): Promise<TaggedResult> {
    const result = await this.command(command)
    if (result.status !== 'OK') {
      throw new Error(result.text)
    }
    return result
  }

  private async command(command: string): Promise<TaggedResult> {
    this.tagCounter += 1
    const tag = `n${this.tagCounter}`
    await this.write(`${tag} ${command}\r\n`)
    return readUntilTagged(this, tag)
  }

  readLine(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.input.read_line_async(GLib.PRIORITY_DEFAULT, this.cancellable, (stream, result) => {
        try {
          const [bytes] = (stream as Gio.DataInputStream).read_line_finish(result)
          resolve(textOf(bytes))
        } catch (error) {
          reject(friendlyError(error))
        }
      })
    })
  }

  async readBytes(count: number): Promise<Uint8Array> {
    const chunks: Uint8Array[] = []
    let received = 0
    while (received < count) {
      const chunk = await this.readChunk(count - received)
      chunks.push(chunk)
      received += chunk.length
    }
    return joined(chunks, count)
  }

  private readChunk(count: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      this.input.read_bytes_async(count, GLib.PRIORITY_DEFAULT, this.cancellable, (stream, result) => {
        try {
          const bytes = (stream as Gio.DataInputStream).read_bytes_finish(result).toArray()
          if (bytes.length === 0) {
            reject(new Error('The server closed the connection'))
            return
          }
          resolve(bytes)
        } catch (error) {
          reject(friendlyError(error))
        }
      })
    })
  }

  private write(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.output.write_all_async(encoder.encode(text), GLib.PRIORITY_DEFAULT, this.cancellable, (stream, result) => {
        try {
          ;(stream as Gio.OutputStream).write_all_finish(result)
          resolve()
        } catch (error) {
          reject(friendlyError(error))
        }
      })
    })
  }
}

function textOf(bytes: Uint8Array | null): string | null {
  if (bytes === null) {
    return null
  }
  return decoder.decode(bytes)
}

function joined(chunks: Uint8Array[], length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk.subarray(0, length - offset), offset)
    offset += chunk.length
  }
  return bytes
}

// What a server says when it refuses a sign-in is rarely what to tell a person.
function loginFailureOf(text: string): string {
  if (/application-specific|app password/i.test(text)) {
    return 'This provider needs an app password, not your usual one.'
  }
  if (/AUTHENTICATIONFAILED|invalid|incorrect|failed|denied/i.test(text)) {
    return 'The server refused the sign-in. Check the user name and password; providers with two-step sign-in need an app password.'
  }
  return text
}

function friendlyError(error: unknown): Error {
  if (error instanceof Error && error.message !== '') {
    return new Error(shortened(error.message))
  }
  return new Error('Could not read the mailbox.')
}

function shortened(message: string): string {
  const firstLine = message.split('\n')[0]
  if (firstLine.length > 140) {
    return `${firstLine.slice(0, 139)}…`
  }
  return firstLine
}
