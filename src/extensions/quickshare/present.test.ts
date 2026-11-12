import { describe, expect, test } from 'bun:test'
import {
  agoText,
  bytesText,
  deviceIconOf,
  fileIconOf,
  pinDigitsOf,
  receivedPicturesOf,
  shareDetailOf,
  shareIconOf,
  shareTitleOf,
} from './present'
import type { HistoryEntry } from './history'

const MINUTE_MS = 60 * 1000

function entry(overrides: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 'a',
    direction: 'incoming',
    peer: 'Pixel 9',
    peerType: 'phone',
    files: [],
    savedPaths: [],
    text: '',
    textKind: '',
    bytesTotal: 0,
    endedAt: 0,
    ...overrides,
  }
}

describe('icons', () => {
  test('picks a device icon by type, a phone when unknown', () => {
    expect(deviceIconOf('tablet')).toBe('tablet-symbolic')
    expect(deviceIconOf('')).toBe('phone-symbolic')
  })

  test('picks a file icon by extension, whatever its case', () => {
    expect(fileIconOf('IMG_0001.JPG')).toBe('image-x-generic-symbolic')
    expect(fileIconOf('clip.mp4')).toBe('video-x-generic-symbolic')
    expect(fileIconOf('README')).toBe('text-x-generic-symbolic')
  })

  test('shows a link share as a link', () => {
    expect(shareIconOf({ files: [], textKind: 'url' })).toBe('insert-link-symbolic')
  })
})

describe('shareTitleOf', () => {
  test('names one file, counts photos and files, and quotes text', () => {
    expect(shareTitleOf({ files: ['a.jpg'], text: '', textKind: '' })).toBe('a.jpg')
    expect(shareTitleOf({ files: ['a.jpg', 'b.png'], text: '', textKind: '' })).toBe('2 photos')
    expect(shareTitleOf({ files: ['a.jpg', 'b.pdf'], text: '', textKind: '' })).toBe('2 files')
    expect(shareTitleOf({ files: [], text: 'https://neoworks.dev', textKind: 'url' })).toBe('https://neoworks.dev')
  })
})

describe('bytesText', () => {
  test('keeps one decimal below ten of a unit', () => {
    expect(bytesText(512)).toBe('512 B')
    expect(bytesText(2.1 * 1024 * 1024)).toBe('2.1 MB')
    expect(bytesText(15 * 1024)).toBe('15 KB')
  })
})

describe('agoText', () => {
  test('reads as a person would say it', () => {
    expect(agoText(0, 30 * 1000)).toBe('just now')
    expect(agoText(0, 5 * MINUTE_MS)).toBe('5 min ago')
    expect(agoText(0, 3 * 60 * MINUTE_MS)).toBe('3 h ago')
    expect(agoText(0, 30 * 60 * MINUTE_MS)).toBe('yesterday')
    expect(agoText(0, 4 * 24 * 60 * MINUTE_MS)).toBe('4 days ago')
  })
})

describe('shareDetailOf', () => {
  test('says who, how much and when', () => {
    expect(shareDetailOf(entry({ bytesTotal: 2048 }), 5 * MINUTE_MS)).toBe('From Pixel 9 · 2.0 KB · 5 min ago')
    expect(shareDetailOf(entry({ direction: 'outgoing' }), 0)).toBe('To Pixel 9 · just now')
  })
})

describe('receivedPicturesOf', () => {
  test('lists received pictures only, newest first, up to the limit', () => {
    const entries = [
      entry({ id: 'b', savedPaths: ['/d/b.jpg', '/d/notes.pdf'] }),
      entry({ id: 's', direction: 'outgoing', savedPaths: ['/d/sent.jpg'] }),
      entry({ id: 'a', savedPaths: ['/d/a1.png', '/d/a2.png'] }),
    ]
    expect(receivedPicturesOf(entries, 2)).toEqual(['/d/b.jpg', '/d/a1.png'])
  })
})

describe('pinDigitsOf', () => {
  test('splits a PIN into digits, ignoring spaces', () => {
    expect(pinDigitsOf('12 34')).toEqual(['1', '2', '3', '4'])
  })
})
