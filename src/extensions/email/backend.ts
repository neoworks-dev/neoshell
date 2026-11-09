import type { Plugin } from '@neoworks/extension-system'
import GLib from 'gi://GLib'
import { RetainedTopics, registerFunction } from '../../lib/bus.js'
import type { BusService } from '../../lib/bus.js'
import { sectionOf } from '../../lib/config.js'
import { recordOf, stringOf } from '../../lib/record.js'
import { requireService } from '../../lib/services.js'
import { accountsOf, pollMinutesOf, validatedAccount, DEFAULT_POLL_MINUTES } from './accounts.js'
import type { Account } from './accounts.js'
import { readInbox } from './imapClient.js'
import { clearPassword, lookupPassword, storePassword } from './keyring.js'
import type { AccountStatus, MailMessage } from './topic.js'

// email: the unread mail of IMAP accounts as one retained topic.
//
//   email.inbox     {accounts: [{id, name, user, status, message, unread}],
//                    messages: [{id, account, accountName, from, address,
//                    subject, time}], unread, updatedAt}
//   email:add       {name, host, port, user, password, security} → {id} | {error}
//   email:remove    {id} → {ok}
//   email:refresh   {} → {ok}
//
// Config names the accounts; their passwords are in the keyring (keyring.ts):
//
//   "email": {"accounts": [{"id": "mail-1a2b", "name": "Work", "host": "imap.example.com",
//             "port": 993, "user": "me@example.com", "security": "tls"}], "pollMinutes": 5}
//
// Only headers are read, the mailbox is opened read-only and nothing is marked
// read. messages are the newest unread across the accounts, newest first.

const ACCOUNTS_KEY = 'email.accounts'
const CONFIG_TIMEOUT_MS = 5000
const MESSAGES_PER_ACCOUNT = 8
const MESSAGES_SHOWN = 12
const TICK_MS = 1000

interface Checked {
  status: AccountStatus
  messages: MailMessage[]
}

const emailExtension: Plugin.Object = {
  name: 'email',
  inject: ['bus'],
  apply(context) {
    const bus = requireService<BusService>(context, 'bus')
    const topics = new RetainedTopics(bus)
    context.effect(() => () => topics.withdrawAll())
    const mail = new Mail(bus, topics)
    context.effect(() =>
      bus.subscribe('config', (message) => {
        mail.configure(message.data)
      }),
    )
    registerFunction(context, bus, 'email:add', (data) => mail.add(data))
    registerFunction(context, bus, 'email:remove', (data) => mail.remove(data))
    registerFunction(context, bus, 'email:refresh', () => mail.refreshNow())
    context.effect(() => {
      const timer = setInterval(() => void mail.tick(), TICK_MS)
      return () => {
        clearInterval(timer)
      }
    })
  },
}

export default emailExtension

class Mail {
  private readonly bus: BusService
  private readonly topics: RetainedTopics
  private accounts: Account[] = []
  private accountsSignature = ''
  private pollMinutes = DEFAULT_POLL_MINUTES
  private lastRefresh = 0
  private refreshing = false
  private stale = true

  constructor(bus: BusService, topics: RetainedTopics) {
    this.bus = bus
    this.topics = topics
  }

  // Config republishes on every edit anywhere; only a change to the accounts
  // is worth checking the mail again for.
  configure(snapshot: unknown): void {
    const section = sectionOf(snapshot, 'email')
    this.pollMinutes = pollMinutesOf(section)
    const accounts = accountsOf(section.accounts)
    const signature = JSON.stringify(accounts)
    if (signature === this.accountsSignature) {
      return
    }
    this.accounts = accounts
    this.accountsSignature = signature
    this.stale = true
    this.publishChecking()
  }

  async tick(): Promise<void> {
    const due = Date.now() - this.lastRefresh >= this.pollMinutes * 60_000
    if (this.refreshing || !(due || this.stale)) {
      return
    }
    await this.refresh()
  }

  async refreshNow(): Promise<Record<string, unknown>> {
    if (!this.refreshing) {
      await this.refresh()
    }
    return { ok: true }
  }

  // The server is asked before anything is stored, so a mistyped address or
  // password is refused with the reason instead of becoming an account that
  // never loads.
  async add(data: unknown): Promise<Record<string, unknown>> {
    const id = `mail-${String(GLib.uuid_string_random()).slice(0, 8)}`
    const checked = validatedAccount(recordOf(data), id)
    if (!checked.ok) {
      return { error: checked.error }
    }
    const { account, password } = checked.value
    try {
      await readInbox(account, password, 1)
    } catch (error) {
      return { error: messageOf(error) }
    }
    try {
      await storePassword(id, account.name, password)
    } catch (error) {
      return { error: `The keyring did not take the password: ${messageOf(error)}` }
    }
    await this.writeAccounts([...this.accounts, account])
    return { id }
  }

  async remove(data: unknown): Promise<Record<string, unknown>> {
    const id = stringOf(recordOf(data).id)
    await clearPassword(id).catch(() => undefined)
    await this.writeAccounts(this.accounts.filter((account) => account.id !== id))
    return { ok: true }
  }

  private async writeAccounts(accounts: Account[]): Promise<void> {
    await this.bus.call('config:set', { key: ACCOUNTS_KEY, value: accounts }, CONFIG_TIMEOUT_MS)
  }

  private async refresh(): Promise<void> {
    this.refreshing = true
    this.stale = false
    try {
      const checked = await Promise.all(this.accounts.map((account) => checkAccount(account)))
      this.publish(checked)
    } finally {
      this.lastRefresh = Date.now()
      this.refreshing = false
    }
  }

  // Until the first answer an account is shown as being checked.
  private publishChecking(): void {
    this.publish(
      this.accounts.map((account) => ({
        status: statusOf(account, 'checking', '', 0),
        messages: [],
      })),
    )
  }

  private publish(checked: Checked[]): void {
    const answered = checked.filter((entry) => entry.status.status === 'ok')
    const messages = checked
      .flatMap((entry) => entry.messages)
      .sort((first, second) => second.time - first.time)
      .slice(0, MESSAGES_SHOWN)
    this.topics.set('email.inbox', {
      accounts: checked.map((entry) => entry.status),
      messages,
      unread: answered.reduce((total, entry) => total + entry.status.unread, 0),
      updatedAt: Date.now(),
    })
  }
}

async function checkAccount(account: Account): Promise<Checked> {
  const password = await lookupPassword(account.id).catch(() => null)
  if (password === null) {
    return failed(account, 'missing', 'The password is not in the keyring. Add the account again.')
  }
  try {
    const reading = await readInbox(account, password, MESSAGES_PER_ACCOUNT)
    return {
      status: statusOf(account, 'ok', '', reading.unread),
      messages: reading.headers.map((header) => ({
        id: `${account.id}:${header.uid}`,
        account: account.id,
        accountName: account.name,
        from: header.from,
        address: header.address,
        subject: header.subject,
        time: header.time,
      })),
    }
  } catch (error) {
    console.error(`email: ${account.name} failed:`, error)
    return failed(account, 'error', messageOf(error))
  }
}

function failed(account: Account, status: string, message: string): Checked {
  return { status: statusOf(account, status, message, 0), messages: [] }
}

function statusOf(account: Account, status: string, message: string, unread: number): AccountStatus {
  return { id: account.id, name: account.name, user: account.user, status, message, unread }
}

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
