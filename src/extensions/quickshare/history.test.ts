import { describe, expect, test } from 'bun:test'
import { HISTORY_LIMIT, historyEntryOf, historyOf, isSavedPath, pairedDevicesOf, withHistoryEntry } from './history'
import type { HistoryEntry } from './history'
import type { Transfer } from './state'

function transfer(id: string, peer: string): Transfer {
  return {
    id,
    direction: 'incoming',
    state: 'finished',
    peer,
    peerType: 'phone',
    pin: '1234',
    files: ['photo.jpg'],
    text: '',
    textKind: '',
    bytesTotal: 2048,
    bytesDone: 2048,
    savedPaths: [`/home/me/Downloads/${id}.jpg`],
  }
}

function entry(id: string, peer: string, endedAt: number): HistoryEntry {
  return historyEntryOf(transfer(id, peer), endedAt)
}

describe('withHistoryEntry', () => {
  test('puts the newest share first', () => {
    const entries = withHistoryEntry([entry('a', 'Pixel 9', 1)], entry('b', 'Pixel 9', 2))
    expect(entries.map((known) => known.id)).toEqual(['b', 'a'])
  })

  test('replaces a share with the same id', () => {
    const entries = withHistoryEntry([entry('a', 'Pixel 9', 1)], entry('a', 'Pixel 9', 5))
    expect(entries).toHaveLength(1)
    expect(entries[0].endedAt).toBe(5)
  })

  test('drops the oldest past the limit', () => {
    let entries: HistoryEntry[] = []
    for (let index = 0; index <= HISTORY_LIMIT; index += 1) {
      entries = withHistoryEntry(entries, entry(`share-${index}`, 'Pixel 9', index))
    }
    expect(entries).toHaveLength(HISTORY_LIMIT)
    expect(entries[entries.length - 1].id).toBe('share-1')
  })
})

describe('historyOf', () => {
  test('reads back what was written', () => {
    const written = [entry('a', 'Pixel 9', 1)]
    expect(historyOf(JSON.parse(JSON.stringify(written)))).toEqual(written)
  })

  test('leaves out entries with no id or peer, and anything not a list', () => {
    expect(historyOf([{ id: 'a' }, { peer: 'Pixel 9' }, 'nonsense'])).toEqual([])
    expect(historyOf({ id: 'a', peer: 'Pixel 9' })).toEqual([])
  })
})

describe('isSavedPath', () => {
  test('knows only the files a share left', () => {
    const entries = [entry('a', 'Pixel 9', 1)]
    expect(isSavedPath(entries, '/home/me/Downloads/a.jpg')).toBe(true)
    expect(isSavedPath(entries, '/home/me/.ssh/id_ed25519')).toBe(false)
    expect(isSavedPath(entries, '')).toBe(false)
  })
})

describe('pairedDevicesOf', () => {
  test('describes each trusted device from its shares, newest first', () => {
    const entries = [entry('c', 'Pixel 9', 30), entry('b', 'Galaxy Tab', 20), entry('a', 'Pixel 9', 10)]
    expect(pairedDevicesOf(['Pixel 9', 'Galaxy Tab'], entries)).toEqual([
      { name: 'Pixel 9', deviceType: 'phone', shares: 2, lastShareAt: 30 },
      { name: 'Galaxy Tab', deviceType: 'phone', shares: 1, lastShareAt: 20 },
    ])
  })

  test('keeps a trusted device that has not shared yet', () => {
    expect(pairedDevicesOf(['Pixel 9'], [])).toEqual([{ name: 'Pixel 9', deviceType: '', shares: 0, lastShareAt: 0 }])
  })
})
