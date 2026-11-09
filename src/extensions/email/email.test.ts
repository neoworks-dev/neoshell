import { describe, expect, test } from 'bun:test'
import {
  accountsOf,
  isLoopbackHost,
  pollMinutesOf,
  validatedAccount,
} from './accounts.js'
import {
  allFailedOf,
  avatarToneOf,
  initialOf,
  latestLineOf,
  problemOf,
  relativeTimeOf,
  senderOf as displaySenderOf,
  subjectOf,
  unreadLabelOf,
} from './display.js'
import {
  decodeWords,
  headerFieldsOf,
  headersOf,
  newestUidsOf,
  quotedOf,
  readUntilTagged,
  searchResultOf,
  senderOf,
} from './imapParse.js'
import type { LineSource } from './imapParse.js'
import { inboxStateOf } from './topic.js'
import type { MailMessage } from './topic.js'

const encoder = new TextEncoder()

// A server that says what it was told to, line by line.
function sourceOf(wire: string): LineSource {
  const bytes = encoder.encode(wire)
  let position = 0
  return {
    readLine(): Promise<string | null> {
      if (position >= bytes.length) {
        return Promise.resolve(null)
      }
      let end = position
      while (end < bytes.length && bytes[end] !== 10) {
        end += 1
      }
      const line = new TextDecoder().decode(bytes.subarray(position, end)).replace(/\r$/, '')
      position = end + 1
      return Promise.resolve(line)
    },
    readBytes(count: number): Promise<Uint8Array> {
      const chunk = bytes.subarray(position, position + count)
      position += count
      return Promise.resolve(chunk)
    },
  }
}

describe('reading responses', () => {
  test('untagged lines come back with the tagged status', async () => {
    const result = await readUntilTagged(
      sourceOf('* 3 EXISTS\r\n* SEARCH 4 9 12\r\nn3 OK SEARCH completed\r\n'),
      'n3',
    )
    expect(result.status).toBe('OK')
    expect(result.text).toBe('SEARCH completed')
    expect(result.responses.map((response) => response.head)).toEqual(['* 3 EXISTS', '* SEARCH 4 9 12'])
    expect(searchResultOf(result.responses)).toEqual([4, 9, 12])
  })

  test('a refusal says why', async () => {
    const result = await readUntilTagged(sourceOf('n1 NO [AUTHENTICATIONFAILED] Invalid credentials\r\n'), 'n1')
    expect(result.status).toBe('NO')
    expect(result.text).toBe('[AUTHENTICATIONFAILED] Invalid credentials')
  })

  test('a literal is read by its length, not by lines, and the rest of the line follows', async () => {
    const header = 'From: Anna <anna@example.com>\r\nSubject: Hi\r\n\r\n'
    const wire = `* 7 FETCH (UID 41 BODY[HEADER.FIELDS (FROM SUBJECT DATE)] {${encoder.encode(header).length}}\r\n${header} FLAGS ())\r\nn4 OK done\r\n`
    const result = await readUntilTagged(sourceOf(wire), 'n4')
    expect(result.responses).toHaveLength(1)
    expect(result.responses[0].literal).toBe(header)
    expect(result.responses[0].tail).toBe(' FLAGS ())')
  })

  test('the byte count of a literal is bytes, not characters', async () => {
    const header = 'Subject: Grüße\r\n\r\n'
    const wire = `* 1 FETCH (UID 2 BODY[HEADER.FIELDS (SUBJECT)] {${encoder.encode(header).length}}\r\n${header})\r\nn1 OK\r\n`
    const [fetched] = (await readUntilTagged(sourceOf(wire), 'n1')).responses
    expect(fetched.literal).toBe(header)
  })

  test('a closed connection is an error', async () => {
    await expect(readUntilTagged(sourceOf('* 1 EXISTS\r\n'), 'n1')).rejects.toThrow('closed')
  })

  test('a literal too large to be a header is refused', async () => {
    await expect(readUntilTagged(sourceOf('* 1 FETCH (BODY[] {999999999}\r\n'), 'n1')).rejects.toThrow('too large')
  })

  test('search results are the numbers after SEARCH, whatever else is on the line', () => {
    expect(searchResultOf([{ head: '* SEARCH', literal: '', tail: '' }])).toEqual([])
    expect(searchResultOf([{ head: '* SEARCH 1 2 x 3', literal: '', tail: '' }])).toEqual([1, 2, 3])
    expect(searchResultOf([{ head: '* 5 EXISTS', literal: '', tail: '' }])).toEqual([])
  })
})

describe('headers', () => {
  const FETCH = (uid: number, literal: string, tail = ')'): { head: string; literal: string; tail: string } => ({
    head: `* ${uid} FETCH (UID ${uid} BODY[HEADER.FIELDS (FROM SUBJECT DATE)]`,
    literal,
    tail,
  })

  test('from, subject and date are read, newest uid first', () => {
    const headers = headersOf([
      FETCH(3, 'From: "Meyer, Anna" <anna@example.com>\r\nSubject: Lunch?\r\nDate: Mon, 9 Nov 2026 14:00:00 +0100\r\n\r\n'),
      FETCH(9, 'From: bob@example.com\r\nSubject: Re: plans\r\nDate: Mon, 9 Nov 2026 15:30:00 +0100 (CET)\r\n\r\n'),
    ])
    expect(headers.map((header) => header.uid)).toEqual([9, 3])
    expect(headers[1]).toEqual({
      uid: 3,
      from: 'Meyer, Anna',
      address: 'anna@example.com',
      subject: 'Lunch?',
      time: Date.parse('2026-11-09T13:00:00Z'),
    })
    expect(headers[0].from).toBe('bob@example.com')
    expect(headers[0].time).toBe(Date.parse('2026-11-09T14:30:00Z'))
  })

  test('the uid may come after the literal', () => {
    const [header] = headersOf([
      { head: '* 2 FETCH (BODY[HEADER.FIELDS (FROM)]', literal: 'From: a@b.c\r\n\r\n', tail: ' UID 77)' },
    ])
    expect(header.uid).toBe(77)
  })

  test('responses with no header text or no uid are dropped', () => {
    expect(headersOf([{ head: '* 1 EXISTS', literal: '', tail: '' }])).toEqual([])
    expect(headersOf([{ head: '* 1 FETCH (FLAGS ())', literal: 'From: a@b.c\r\n', tail: ')' }])).toEqual([])
  })

  test('a folded subject is one line, and a repeated header keeps the first', () => {
    const fields = headerFieldsOf('Subject: a very\r\n long subject\r\n\tindeed\r\nsubject: ignored\r\nFrom: x@y.z\r\n')
    expect(fields.get('subject')).toBe('a very long subject indeed')
    expect(fields.get('from')).toBe('x@y.z')
  })

  test('encoded words in base64 and quoted-printable, UTF-8 and Latin-1', () => {
    expect(decodeWords('=?UTF-8?B?R3LDvMOfZQ==?=')).toBe('Grüße')
    expect(decodeWords('=?utf-8?Q?Caf=C3=A9_du_jour?=')).toBe('Café du jour')
    expect(decodeWords('=?ISO-8859-1?Q?Andr=E9?= <a@b.c>')).toBe('André <a@b.c>')
    expect(decodeWords(undefined)).toBe('')
  })

  test('adjacent encoded words join without the space between them', () => {
    expect(decodeWords('=?UTF-8?Q?Hello_?= =?UTF-8?Q?World?=')).toBe('Hello World')
    expect(decodeWords('plain =?UTF-8?Q?bold?= plain')).toBe('plain bold plain')
  })

  test('an unknown charset still gives text', () => {
    expect(decodeWords('=?x-nonsense?Q?abc?=')).toBe('abc')
  })

  test('senders', () => {
    expect(senderOf('Anna Meyer <anna@example.com>')).toEqual({ name: 'Anna Meyer', address: 'anna@example.com' })
    expect(senderOf('"Meyer, Anna" <anna@example.com>')).toEqual({ name: 'Meyer, Anna', address: 'anna@example.com' })
    expect(senderOf('<noreply@example.com>')).toEqual({ name: 'noreply@example.com', address: 'noreply@example.com' })
    expect(senderOf('=?UTF-8?B?w4RybmU=?= <arne@example.com>').name).toBe('Ärne')
    expect(senderOf('bare@example.com')).toEqual({ name: 'bare@example.com', address: 'bare@example.com' })
    expect(senderOf(undefined)).toEqual({ name: '', address: '' })
  })

  test('commands quote what a person typed', () => {
    expect(quotedOf('pa"ss\\word')).toBe('"pa\\"ss\\\\word"')
    expect(quotedOf('line\r\nbreak')).toBeNull()
    expect(quotedOf('nul\0')).toBeNull()
  })

  test('the newest uids, newest first', () => {
    expect(newestUidsOf([4, 90, 12, 7], 2)).toEqual([90, 12])
    expect(newestUidsOf([], 5)).toEqual([])
  })
})

describe('accounts', () => {
  const GOOD = { name: 'Work', host: 'imap.example.com', user: 'me@example.com', password: 'secret', port: 993, security: 'tls' }

  test('accounts are read from the config, skipping what is incomplete', () => {
    const accounts = accountsOf([
      { id: 'a', name: 'Work', host: 'imap.example.com', port: 993, user: 'me', security: 'tls' },
      { id: '', host: 'x' },
      { id: 'b', host: 'localhost', security: 'plain', port: 1143 },
      7,
    ])
    expect(accounts.map((account) => account.id)).toEqual(['a', 'b'])
    expect(accounts[1].security).toBe('plain')
    expect(accountsOf('nope')).toEqual([])
  })

  test('a new account is checked and the name defaults to the user', () => {
    const result = validatedAccount({ ...GOOD, name: '  ' }, 'mail-1')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.account).toEqual({
        id: 'mail-1',
        name: 'me@example.com',
        host: 'imap.example.com',
        port: 993,
        user: 'me@example.com',
        security: 'tls',
      })
      expect(result.value.password).toBe('secret')
    }
  })

  test('each missing piece is refused with what to fix', () => {
    expect(validatedAccount({ ...GOOD, host: '' }, 'x').ok).toBe(false)
    expect(validatedAccount({ ...GOOD, host: 'bad host!' }, 'x').ok).toBe(false)
    expect(validatedAccount({ ...GOOD, user: '' }, 'x').ok).toBe(false)
    expect(validatedAccount({ ...GOOD, password: '' }, 'x').ok).toBe(false)
    expect(validatedAccount({ ...GOOD, password: 'a\nb' }, 'x').ok).toBe(false)
    expect(validatedAccount({ ...GOOD, port: 70000 }, 'x').ok).toBe(false)
  })

  test('an unencrypted connection is only for this computer', () => {
    expect(validatedAccount({ ...GOOD, security: 'plain' }, 'x').ok).toBe(false)
    expect(validatedAccount({ ...GOOD, host: '127.0.0.1', security: 'plain', port: 1143 }, 'x').ok).toBe(true)
    expect(validatedAccount({ ...GOOD, host: 'localhost', security: 'plain' }, 'x').ok).toBe(true)
    expect(isLoopbackHost('LOCALHOST')).toBe(true)
    expect(isLoopbackHost('mail.example.com')).toBe(false)
  })

  test('the port follows the security when it is left out', () => {
    const tls = validatedAccount({ ...GOOD, port: undefined }, 'x')
    const plain = validatedAccount({ ...GOOD, host: 'localhost', security: 'plain', port: undefined }, 'x')
    expect(tls.ok && tls.value.account.port).toBe(993)
    expect(plain.ok && plain.value.account.port).toBe(143)
  })

  test('the poll interval is clamped', () => {
    expect(pollMinutesOf({})).toBe(5)
    expect(pollMinutesOf({ pollMinutes: 0 })).toBe(1)
    expect(pollMinutesOf({ pollMinutes: 500 })).toBe(30)
  })
})

function message(fields: Partial<MailMessage>): MailMessage {
  return {
    id: 'a:1',
    account: 'a',
    accountName: 'Work',
    from: 'Anna Meyer',
    address: 'anna@example.com',
    subject: 'Lunch?',
    time: 0,
    ...fields,
  }
}

describe('what the card says', () => {
  const NOW = Date.parse('2026-11-09T15:00:00Z')

  test('ages are as short as they can be', () => {
    expect(relativeTimeOf(NOW - 20_000, NOW)).toBe('now')
    expect(relativeTimeOf(NOW - 12 * 60_000, NOW)).toBe('12m')
    expect(relativeTimeOf(NOW - 3 * 3_600_000, NOW)).toBe('3h')
    expect(relativeTimeOf(0, NOW)).toBe('')
    const threeDays = NOW - 3 * 86_400_000
    expect(relativeTimeOf(threeDays, NOW)).toBe(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(threeDays).getDay()])
    const monthAgo = NOW - 30 * 86_400_000
    expect(relativeTimeOf(monthAgo, NOW)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/)
  })

  test('the avatar letter and colour', () => {
    expect(initialOf(message({}))).toBe('A')
    expect(initialOf(message({ from: '"…" ', address: 'zed@example.com' }))).toBe('Z')
    expect(initialOf(message({ from: '', address: '' }))).toBe('?')
    expect(initialOf(message({ from: 'élodie' }))).toBe('É')
    expect(avatarToneOf('anna@example.com')).toBe(avatarToneOf('ANNA@example.com'))
    expect(avatarToneOf('anna@example.com')).toBeLessThan(6)
    expect(avatarToneOf('anna@example.com')).toBeGreaterThanOrEqual(0)
  })

  test('words for the message', () => {
    expect(subjectOf(message({ subject: '  ' }))).toBe('(no subject)')
    expect(displaySenderOf(message({ from: '' }))).toBe('anna@example.com')
    expect(unreadLabelOf(1)).toBe('unread message')
    expect(unreadLabelOf(0)).toBe('unread messages')
  })

  test('the state is read defensively', () => {
    const state = inboxStateOf({
      accounts: [{ id: 'a', name: 'Work', status: 'ok', unread: 3 }, { name: 'no id' }],
      messages: [{ id: 'a:1', from: 'Anna', time: 5 }, 'x'],
      unread: 3,
    })
    expect(state.accounts).toHaveLength(1)
    expect(state.messages).toHaveLength(1)
    expect(state.unread).toBe(3)
    expect(inboxStateOf(null).accounts).toEqual([])
  })

  test('every account failing is different from one still being checked', () => {
    const failing = inboxStateOf({
      accounts: [
        { id: 'a', name: 'Work', status: 'error', message: 'The server refused the sign-in.' },
        { id: 'b', name: 'Home', status: 'missing', message: 'No password.' },
      ],
    })
    expect(allFailedOf(failing)).toBe(true)
    expect(problemOf(failing.accounts)).toBe('Work: The server refused the sign-in.')
    const checking = inboxStateOf({ accounts: [{ id: 'a', name: 'Work', status: 'checking' }] })
    expect(allFailedOf(checking)).toBe(false)
    const mixed = inboxStateOf({
      accounts: [
        { id: 'a', name: 'Work', status: 'ok', unread: 1 },
        { id: 'b', name: 'Home', status: 'error', message: 'down' },
      ],
    })
    expect(allFailedOf(mixed)).toBe(false)
    expect(problemOf(mixed.accounts)).toBe('Home: down')
    expect(allFailedOf(inboxStateOf({ accounts: [] }))).toBe(false)
  })

  test('the newest sender, or inbox zero', () => {
    expect(latestLineOf(inboxStateOf({ messages: [{ id: 'a:1', from: 'Anna' }] }))).toBe('Anna')
    expect(latestLineOf(inboxStateOf({}))).toBe('Inbox zero')
  })
})
