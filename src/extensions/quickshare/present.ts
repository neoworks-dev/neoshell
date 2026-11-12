import type { HistoryEntry } from './history.js'

// How Settings → Quick Share words and pictures what the backend reports.

const DEVICE_ICONS: Record<string, string> = {
  phone: 'phone-symbolic',
  tablet: 'tablet-symbolic',
  laptop: 'computer-symbolic',
}
const UNKNOWN_DEVICE_ICON = 'phone-symbolic'

const DEVICE_NAMES: Record<string, string> = {
  phone: 'Phone',
  tablet: 'Tablet',
  laptop: 'Laptop',
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif', 'bmp', 'tif', 'tiff'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', '3gp'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'ogg', 'opus', 'flac', 'wav', 'aac'])
const ARCHIVE_EXTENSIONS = new Set(['zip', 'tar', 'gz', 'xz', 'zst', '7z', 'rar', 'apk'])
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp'])

const UNITS = ['B', 'KB', 'MB', 'GB']
const BYTES_PER_UNIT = 1024

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function deviceIconOf(deviceType: string): string {
  const icon = DEVICE_ICONS[deviceType]
  if (icon === undefined) {
    return UNKNOWN_DEVICE_ICON
  }
  return icon
}

export function deviceKindOf(deviceType: string): string {
  const name = DEVICE_NAMES[deviceType]
  if (name === undefined) {
    return 'Device'
  }
  return name
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) {
    return ''
  }
  return name.slice(dot + 1).toLowerCase()
}

export function isImageName(name: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(name))
}

export function fileIconOf(name: string): string {
  const extension = extensionOf(name)
  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image-x-generic-symbolic'
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return 'video-x-generic-symbolic'
  }
  if (AUDIO_EXTENSIONS.has(extension)) {
    return 'audio-x-generic-symbolic'
  }
  if (ARCHIVE_EXTENSIONS.has(extension)) {
    return 'package-x-generic-symbolic'
  }
  if (DOCUMENT_EXTENSIONS.has(extension)) {
    return 'x-office-document-symbolic'
  }
  return 'text-x-generic-symbolic'
}

/** The icon for a share as a whole: its text kind, or its first file. */
export function shareIconOf(entry: { files: string[]; textKind: string }): string {
  if (entry.textKind === 'url') {
    return 'insert-link-symbolic'
  }
  if (entry.textKind === 'wifi') {
    return 'network-wireless-symbolic'
  }
  if (entry.textKind === 'text') {
    return 'edit-paste-symbolic'
  }
  const first = entry.files[0]
  if (first === undefined) {
    return 'text-x-generic-symbolic'
  }
  return fileIconOf(first)
}

/** One file's name, or how many there are; a text share's own words. */
export function shareTitleOf(entry: { files: string[]; text: string; textKind: string }): string {
  if (entry.textKind !== '' && entry.text !== '') {
    return entry.text
  }
  if (entry.files.length === 1) {
    return entry.files[0]
  }
  if (entry.files.length === 0) {
    return 'Nothing'
  }
  if (entry.files.every(isImageName)) {
    return `${entry.files.length} photos`
  }
  return `${entry.files.length} files`
}

export function bytesText(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= BYTES_PER_UNIT && unit < UNITS.length - 1) {
    value /= BYTES_PER_UNIT
    unit += 1
  }
  if (unit === 0 || value >= 10) {
    return `${Math.round(value)} ${UNITS[unit]}`
  }
  return `${value.toFixed(1)} ${UNITS[unit]}`
}

export function agoText(then: number, now: number): string {
  const elapsed = Math.max(0, now - then)
  if (elapsed < MINUTE_MS) {
    return 'just now'
  }
  if (elapsed < HOUR_MS) {
    return `${Math.floor(elapsed / MINUTE_MS)} min ago`
  }
  if (elapsed < DAY_MS) {
    return `${Math.floor(elapsed / HOUR_MS)} h ago`
  }
  const days = Math.floor(elapsed / DAY_MS)
  if (days === 1) {
    return 'yesterday'
  }
  return `${days} days ago`
}

/** "From Pixel 9 · 2.1 MB · 5 min ago", or "To …" for a send. */
export function shareDetailOf(entry: HistoryEntry, now: number): string {
  const parts = [`${directionWordOf(entry.direction)} ${entry.peer}`]
  if (entry.bytesTotal > 0) {
    parts.push(bytesText(entry.bytesTotal))
  }
  parts.push(agoText(entry.endedAt, now))
  return parts.join(' · ')
}

function directionWordOf(direction: string): string {
  if (direction === 'outgoing') {
    return 'To'
  }
  return 'From'
}

/** The received pictures across the history, newest first. */
export function receivedPicturesOf(entries: HistoryEntry[], limit: number): string[] {
  return entries
    .filter((entry) => entry.direction === 'incoming')
    .flatMap((entry) => entry.savedPaths.filter(isImageName))
    .slice(0, limit)
}

/** A PIN as separate digits, for the boxes the pairing screen draws them in. */
export function pinDigitsOf(pin: string): string[] {
  return pin.replace(/\s/g, '').split('')
}
