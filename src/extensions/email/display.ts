import type { AccountStatus, InboxState, MailMessage } from './topic.js'

// The words and colours the card gives a message.

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const AVATAR_TONES = 6

/** "now", "12m", "3h", "Mon", "Nov 2": as little as says how long ago. */
export function relativeTimeOf(time: number, now: number): string {
  if (time <= 0) {
    return ''
  }
  const age = now - time
  if (age < MINUTE_MS) {
    return 'now'
  }
  if (age < HOUR_MS) {
    return `${Math.floor(age / MINUTE_MS)}m`
  }
  if (age < DAY_MS) {
    return `${Math.floor(age / HOUR_MS)}h`
  }
  const date = new Date(time)
  if (age < 7 * DAY_MS) {
    return WEEKDAYS[date.getDay()]
  }
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`
}

/** The letter in a sender's avatar: the first letter or digit of the name, else of the address. */
export function initialOf(message: MailMessage): string {
  for (const source of [message.from, message.address]) {
    const match = /[\p{L}\p{N}]/u.exec(source)
    if (match !== null) {
      return match[0].toUpperCase()
    }
  }
  return '?'
}

/** Which of the avatar colours a sender gets: the same one every time. */
export function avatarToneOf(address: string): number {
  let hash = 0
  for (const character of address.toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1_000_003
  }
  return hash % AVATAR_TONES
}

export function subjectOf(message: MailMessage): string {
  if (message.subject.trim() === '') {
    return '(no subject)'
  }
  return message.subject
}

export function senderOf(message: MailMessage): string {
  if (message.from !== '') {
    return message.from
  }
  return message.address
}

/** Accounts that could be read, which is what an unread count is the sum of. */
export function answeringOf(accounts: AccountStatus[]): AccountStatus[] {
  return accounts.filter((account) => account.status === 'ok')
}

/** Whether there is nothing to show because no account answered. */
export function allFailedOf(state: InboxState): boolean {
  return state.accounts.length > 0 && answeringOf(state.accounts).length === 0 && !checkingOf(state.accounts)
}

function checkingOf(accounts: AccountStatus[]): boolean {
  return accounts.some((account) => account.status === 'checking')
}

/** The first account problem worth telling the user about. */
export function problemOf(accounts: AccountStatus[]): string {
  const failed = accounts.find((account) => account.status === 'error' || account.status === 'missing')
  if (failed === undefined) {
    return ''
  }
  return `${failed.name}: ${failed.message}`
}

export function unreadLabelOf(count: number): string {
  if (count === 1) {
    return 'unread message'
  }
  return 'unread messages'
}

/** The line under the headline: who it is from, or that the inbox is clear. */
export function latestLineOf(state: InboxState): string {
  const latest = state.messages[0]
  if (latest === undefined) {
    return 'Inbox zero'
  }
  return senderOf(latest)
}
