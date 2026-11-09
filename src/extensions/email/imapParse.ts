// The parts of IMAP and of mail headers that are only text: reading a
// server's responses, the search result, and a message's From, Subject and
// Date. No sockets in here; imapClient.ts drives them.

export interface LineSource {
  /** The next line without its line ending; null once the connection has closed. */
  readLine(): Promise<string | null>
  /** Exactly `count` bytes. */
  readBytes(count: number): Promise<Uint8Array>
}

// One untagged response. A FETCH that returns header text carries it as a
// literal: `* 3 FETCH (UID 9 BODY[HEADER.FIELDS (FROM)] {42}` and then 42
// bytes, then the rest of the line, `)`.
export interface ImapResponse {
  head: string
  literal: string
  tail: string
}

export interface TaggedResult {
  responses: ImapResponse[]
  status: string
  text: string
}

export interface Header {
  uid: number
  from: string
  address: string
  subject: string
  // ms since the epoch; 0 when the message has no readable date
  time: number
}

const LITERAL_PATTERN = /\{(\d+)\}$/
const MAX_LITERAL_BYTES = 256 * 1024
// What UTF-8 decoding puts in place of bytes that are not UTF-8.
const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd)
const ENCODED_WORD_PATTERN = /=\?([^?\s]+)\?([bBqQ])\?([^?]*)\?=/g

/** Reads responses until the one tagged `tag`, which says how the command went. */
export async function readUntilTagged(source: LineSource, tag: string): Promise<TaggedResult> {
  const responses: ImapResponse[] = []
  for (;;) {
    const line = await source.readLine()
    if (line === null) {
      throw new Error('The server closed the connection')
    }
    if (line.startsWith(`${tag} `)) {
      return taggedOf(responses, line.slice(tag.length + 1))
    }
    responses.push(await readResponse(source, line))
  }
}

function taggedOf(responses: ImapResponse[], rest: string): TaggedResult {
  const space = rest.indexOf(' ')
  if (space < 0) {
    return { responses, status: rest, text: '' }
  }
  return { responses, status: rest.slice(0, space), text: rest.slice(space + 1) }
}

async function readResponse(source: LineSource, line: string): Promise<ImapResponse> {
  let head = line
  let literal = ''
  let tail = ''
  let pending = LITERAL_PATTERN.exec(line)
  if (pending !== null) {
    head = line.slice(0, pending.index)
  }
  while (pending !== null) {
    literal += decodeText(await source.readBytes(boundedLength(Number(pending[1]))))
    tail = await continuationOf(source)
    pending = LITERAL_PATTERN.exec(tail)
  }
  return { head, literal, tail }
}

// What is left of the line after a literal; a closed connection leaves nothing.
async function continuationOf(source: LineSource): Promise<string> {
  const line = await source.readLine()
  if (line === null) {
    return ''
  }
  return line
}

// A server that announces a gigabyte header is not one to read it from.
function boundedLength(announced: number): number {
  if (announced > MAX_LITERAL_BYTES) {
    throw new Error('The server sent a header that is too large')
  }
  return announced
}

/** UTF-8, or Latin-1 for the old mail that is not. */
export function decodeText(bytes: Uint8Array): string {
  const text = new TextDecoder('utf-8').decode(bytes)
  if (!text.includes(REPLACEMENT_CHARACTER)) {
    return text
  }
  return new TextDecoder('latin1').decode(bytes)
}

/** The message numbers or uids a `SEARCH` answered with. */
export function searchResultOf(responses: ImapResponse[]): number[] {
  return responses
    .filter((response) => /^\* SEARCH\b/.test(response.head))
    .flatMap((response) => response.head.slice('* SEARCH'.length).trim().split(/\s+/))
    .filter((word) => /^\d+$/.test(word))
    .map(Number)
}

/** The headers of every FETCH response that carries them, newest uid first. */
export function headersOf(responses: ImapResponse[]): Header[] {
  return responses
    .filter((response) => /^\* \d+ FETCH\b/.test(response.head) && response.literal !== '')
    .map(headerOf)
    .filter((header) => header.uid > 0)
    .sort((first, second) => second.uid - first.uid)
}

function headerOf(response: ImapResponse): Header {
  const uidMatch = /\bUID (\d+)/.exec(`${response.head} ${response.tail}`)
  const fields = headerFieldsOf(response.literal)
  const sender = senderOf(fields.get('from'))
  return {
    uid: uidOf(uidMatch),
    from: sender.name,
    address: sender.address,
    subject: decodeWords(fields.get('subject')),
    time: timeOf(fields.get('date')),
  }
}

function uidOf(match: RegExpExecArray | null): number {
  if (match === null) {
    return 0
  }
  return Number(match[1])
}

/** Header lines joined where they were folded, by lower-case name; the first of a repeated header wins. */
export function headerFieldsOf(text: string): Map<string, string> {
  const fields = new Map<string, string>()
  const unfolded = text.replace(/\r?\n[ \t]+/g, ' ')
  for (const line of unfolded.split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon <= 0) {
      continue
    }
    const name = line.slice(0, colon).trim().toLowerCase()
    if (!fields.has(name)) {
      fields.set(name, line.slice(colon + 1).trim())
    }
  }
  return fields
}

/** A header value with its RFC 2047 encoded words ("=?UTF-8?B?…?=") turned into text. */
export function decodeWords(value: string | undefined): string {
  if (value === undefined) {
    return ''
  }
  // Whitespace between two encoded words is not part of the text.
  const joined = value.replace(/(\?=)\s+(?==\?)/g, '$1')
  return joined.replace(ENCODED_WORD_PATTERN, (_word, charset: string, encoding: string, payload: string) =>
    decodeWord(charset, encoding, payload),
  )
}

function decodeWord(charset: string, encoding: string, payload: string): string {
  const bytes = wordBytesOf(encoding, payload)
  try {
    return new TextDecoder(charset.toLowerCase()).decode(bytes)
  } catch {
    return decodeText(bytes)
  }
}

function wordBytesOf(encoding: string, payload: string): Uint8Array {
  if (encoding.toLowerCase() === 'b') {
    return bytesOfBase64(payload)
  }
  return bytesOfQuoted(payload)
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function bytesOfBase64(text: string): Uint8Array {
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const character of text) {
    const value = BASE64_ALPHABET.indexOf(character)
    if (value < 0) {
      continue
    }
    buffer = (buffer << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  return Uint8Array.from(bytes)
}

function bytesOfQuoted(text: string): Uint8Array {
  const bytes: number[] = []
  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    if (character === '_') {
      bytes.push(0x20)
      continue
    }
    if (character === '=' && /^[0-9a-fA-F]{2}$/.test(text.slice(index + 1, index + 3))) {
      bytes.push(Number.parseInt(text.slice(index + 1, index + 3), 16))
      index += 2
      continue
    }
    bytes.push(...new TextEncoder().encode(character))
  }
  return Uint8Array.from(bytes)
}

/** "Anna Meyer <anna@example.com>", `"Meyer, Anna" <…>`, or a bare address, as a name and an address. */
export function senderOf(value: string | undefined): { name: string; address: string } {
  const decoded = decodeWords(value).trim()
  const match = /^(.*?)\s*<([^>]*)>/.exec(decoded)
  if (match === null) {
    return { name: decoded, address: decoded }
  }
  const name = match[1].replace(/^"(.*)"$/, '$1').replace(/\\(.)/g, '$1').trim()
  if (name === '') {
    return { name: match[2], address: match[2] }
  }
  return { name, address: match[2] }
}

function timeOf(value: string | undefined): number {
  if (value === undefined) {
    return 0
  }
  const time = Date.parse(value.replace(/\([^)]*\)/g, '').trim())
  if (Number.isNaN(time)) {
    return 0
  }
  return time
}

/** A string as an IMAP quoted string, or null for one that cannot be sent in quotes. */
export function quotedOf(text: string): string | null {
  if (/[\r\n\0]/.test(text)) {
    return null
  }
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** The uids to fetch headers for: the newest `count`, as a comma list. */
export function newestUidsOf(uids: number[], count: number): number[] {
  return [...uids].sort((first, second) => second - first).slice(0, count)
}
