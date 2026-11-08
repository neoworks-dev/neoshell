import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import Soup from 'gi://Soup?version=3.0'

// What a browser drops is a URI, not a file: an image's http(s) address or a
// data: URI. The Tray only keeps paths, so such a drop is fetched into the
// Tray's own cache directory first, and a cached copy is deleted again when
// its tile is removed.

// Some image hosts refuse a request without a user agent of its own.
const session = new Soup.Session({ user_agent: 'neoshell-tray/1.0' })
const FALLBACK_NAME = 'download'
const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'text/plain': 'txt',
  'text/html': 'html',
  'application/pdf': 'pdf',
}

export function trayCacheDirectory(): string {
  return GLib.build_filenamev([GLib.get_user_cache_dir(), 'neoshell', 'tray'])
}

export function isCachedCopy(path: string): boolean {
  return path.startsWith(`${trayCacheDirectory()}/`)
}

export function deleteCachedCopy(path: string): void {
  if (!isCachedCopy(path)) {
    return
  }
  try {
    Gio.File.new_for_path(path).delete(null)
  } catch (error) {
    console.error(`tray: cannot delete ${path}:`, error)
  }
}

// The downloaded files' paths, in drop order; a URI that fails is left out.
export async function downloadAll(uris: string[]): Promise<string[]> {
  const paths = await Promise.all(uris.map(downloadOrNull))
  return paths.filter((path): path is string => path !== null)
}

async function downloadOrNull(uri: string): Promise<string | null> {
  try {
    return await download(uri)
  } catch (error) {
    console.error(`tray: cannot fetch ${uri}:`, error)
    return null
  }
}

async function download(uri: string): Promise<string | null> {
  if (uri.startsWith('data:')) {
    return saveDataUri(uri)
  }
  if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
    console.warn(`tray: ignoring a dropped ${uri}`)
    return null
  }
  return fetchHttp(uri)
}

function saveDataUri(uri: string): string | null {
  const comma = uri.indexOf(',')
  if (comma === -1) {
    return null
  }
  const header = uri.slice('data:'.length, comma)
  const payload = uri.slice(comma + 1)
  const mimeType = header.split(';')[0]
  const destination = freshPath(withExtension(FALLBACK_NAME, mimeType))
  const file = Gio.File.new_for_path(destination)
  file.replace_contents(dataBytesOf(header, payload), null, false, Gio.FileCreateFlags.NONE, null)
  return destination
}

function dataBytesOf(header: string, payload: string): Uint8Array {
  if (header.endsWith(';base64')) {
    return GLib.base64_decode(decodeURIComponent(payload))
  }
  return new TextEncoder().encode(decodeURIComponent(payload))
}

async function fetchHttp(uri: string): Promise<string> {
  const message = Soup.Message.new('GET', uri)
  if (message === null) {
    throw new Error('malformed URI')
  }
  const input = await send(message)
  const status = message.get_status()
  if (status < 200 || status >= 300) {
    throw new Error(`the server answered ${status}`)
  }
  const destination = freshPath(nameFor(uri, message))
  await saveStream(input, destination)
  return destination
}

function send(message: Soup.Message): Promise<Gio.InputStream> {
  return new Promise((resolve, reject) => {
    session.send_async(message, GLib.PRIORITY_DEFAULT, null, (_session, result) => {
      try {
        resolve(session.send_finish(result))
      } catch (error) {
        reject(error)
      }
    })
  })
}

function saveStream(input: Gio.InputStream, destination: string): Promise<void> {
  const output = Gio.File.new_for_path(destination).create(Gio.FileCreateFlags.NONE, null)
  const flags = Gio.OutputStreamSpliceFlags.CLOSE_SOURCE | Gio.OutputStreamSpliceFlags.CLOSE_TARGET
  return new Promise((resolve, reject) => {
    output.splice_async(input, flags, GLib.PRIORITY_DEFAULT, null, (_output, result) => {
      try {
        output.splice_finish(result)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  })
}

// The URI's last path segment, given an extension from the response's type
// when it has none: image CDNs often serve /photo?id=… with no name at all.
function nameFor(uri: string, message: Soup.Message): string {
  const [contentType] = message.get_response_headers().get_content_type()
  return withExtension(lastSegmentOf(uri), contentType)
}

function lastSegmentOf(uri: string): string {
  const parsed = GLib.Uri.parse(uri, GLib.UriFlags.NONE)
  if (parsed === null) {
    return FALLBACK_NAME
  }
  const segments = String(parsed.get_path()).split('/').filter((segment) => segment !== '')
  if (segments.length === 0) {
    return FALLBACK_NAME
  }
  const name = safeName(GLib.Uri.unescape_string(segments[segments.length - 1], null))
  if (name === '') {
    return FALLBACK_NAME
  }
  return name
}

function safeName(name: string | null): string {
  if (name === null) {
    return ''
  }
  return name.replace(/[/\0]/g, '_').replace(/^\.+/, '')
}

function withExtension(name: string, mimeType: string | null): string {
  if (name.includes('.') || mimeType === null) {
    return name
  }
  const extension = EXTENSIONS[mimeType]
  if (extension === undefined) {
    return name
  }
  return `${name}.${extension}`
}

// The dropped name when it is free, otherwise "name 2.ext", "name 3.ext", ….
function freshPath(name: string): string {
  const directory = trayCacheDirectory()
  GLib.mkdir_with_parents(directory, 0o700)
  const dot = name.lastIndexOf('.')
  let stem = name
  let extension = ''
  if (dot > 0) {
    stem = name.slice(0, dot)
    extension = name.slice(dot)
  }
  let candidate = GLib.build_filenamev([directory, name])
  for (let counter = 2; GLib.file_test(candidate, GLib.FileTest.EXISTS); counter += 1) {
    candidate = GLib.build_filenamev([directory, `${stem} ${counter}${extension}`])
  }
  return candidate
}
