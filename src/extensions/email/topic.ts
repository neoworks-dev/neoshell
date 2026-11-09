import { arrayOf, numberOf, recordOf, stringOf } from '../../lib/record.js'

// What the card and the Settings page read out of an email.inbox message.

export interface MailMessage {
  id: string
  account: string
  accountName: string
  from: string
  address: string
  subject: string
  // ms since the epoch; 0 when unknown
  time: number
}

export interface AccountStatus {
  id: string
  name: string
  user: string
  // ok | error | missing (no password in the keyring) | checking
  status: string
  message: string
  unread: number
}

export interface InboxState {
  accounts: AccountStatus[]
  messages: MailMessage[]
  // Unread across the accounts that answered.
  unread: number
  updatedAt: number
}

export function inboxStateOf(data: unknown): InboxState {
  const record = recordOf(data)
  return {
    accounts: arrayOf(record.accounts).flatMap(accountStatusOf),
    messages: arrayOf(record.messages).flatMap(messageOf),
    unread: numberOf(record.unread, 0),
    updatedAt: numberOf(record.updatedAt, 0),
  }
}

function accountStatusOf(record: Record<string, unknown>): AccountStatus[] {
  const id = stringOf(record.id)
  if (id === '') {
    return []
  }
  return [
    {
      id,
      name: stringOf(record.name),
      user: stringOf(record.user),
      status: stringOf(record.status),
      message: stringOf(record.message),
      unread: numberOf(record.unread, 0),
    },
  ]
}

function messageOf(record: Record<string, unknown>): MailMessage[] {
  const id = stringOf(record.id)
  if (id === '') {
    return []
  }
  return [
    {
      id,
      account: stringOf(record.account),
      accountName: stringOf(record.accountName),
      from: stringOf(record.from),
      address: stringOf(record.address),
      subject: stringOf(record.subject),
      time: numberOf(record.time, 0),
    },
  ]
}
