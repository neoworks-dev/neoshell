import { arrayOf, numberOf, stringOf } from '../../lib/record.js'

// The mail accounts in the config, and what a new one has to look like.
//
//   "email": {"accounts": [{"id": "mail-1a2b", "name": "Work",
//                           "host": "imap.example.com", "port": 993,
//                           "user": "me@example.com", "security": "tls"}],
//             "pollMinutes": 5}
//
// The password is in the keyring (keyring.ts), never in the config.

export interface Account {
  id: string
  name: string
  host: string
  port: number
  user: string
  // tls: the connection is encrypted from the first byte. plain: not at all,
  // which is only accepted for a server on this computer, such as a bridge.
  security: string
}

export const DEFAULT_POLL_MINUTES = 5
export const MIN_POLL_MINUTES = 1
export const MAX_POLL_MINUTES = 30
export const TLS_PORT = 993
export const PLAIN_PORT = 143

const HOST_PATTERN = /^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export function accountsOf(value: unknown): Account[] {
  return arrayOf(value).flatMap(accountOf)
}

function accountOf(record: Record<string, unknown>): Account[] {
  const id = stringOf(record.id)
  const host = stringOf(record.host)
  if (id === '' || host === '') {
    return []
  }
  return [
    {
      id,
      name: stringOf(record.name),
      host,
      port: numberOf(record.port, TLS_PORT),
      user: stringOf(record.user),
      security: securityOf(record.security),
    },
  ]
}

function securityOf(value: unknown): string {
  if (value === 'plain') {
    return 'plain'
  }
  return 'tls'
}

export function pollMinutesOf(section: Record<string, unknown>): number {
  const minutes = numberOf(section.pollMinutes, DEFAULT_POLL_MINUTES)
  return Math.min(MAX_POLL_MINUTES, Math.max(MIN_POLL_MINUTES, Math.round(minutes)))
}

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.toLowerCase())
}

export interface NewAccount {
  account: Account
  password: string
}

export type Validated = { ok: true; value: NewAccount } | { ok: false; error: string }

/** What the Settings form sent, checked: a refusal says what to fix. */
export function validatedAccount(request: Record<string, unknown>, id: string): Validated {
  const host = stringOf(request.host).trim()
  const user = stringOf(request.user).trim()
  const password = stringOf(request.password)
  const security = securityOf(request.security)
  const port = Math.round(numberOf(request.port, defaultPortFor(security)))
  if (!HOST_PATTERN.test(host) && !LOOPBACK_HOSTS.has(host)) {
    return { ok: false, error: 'Enter the IMAP server’s name, like imap.example.com.' }
  }
  if (user === '' || /[\r\n\0]/.test(user)) {
    return { ok: false, error: 'Enter the user name, usually the full address.' }
  }
  if (password === '' || /[\r\n\0]/.test(password)) {
    return { ok: false, error: 'Enter the password. Providers with two-step sign-in need an app password.' }
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, error: 'The port is a number from 1 to 65535.' }
  }
  if (security === 'plain' && !isLoopbackHost(host)) {
    return { ok: false, error: 'An unencrypted connection is only allowed to a server on this computer.' }
  }
  const name = stringOf(request.name).trim()
  return { ok: true, value: { account: { id, name: nameOr(name, user), host, port, user, security }, password } }
}

function defaultPortFor(security: string): number {
  if (security === 'plain') {
    return PLAIN_PORT
  }
  return TLS_PORT
}

function nameOr(name: string, user: string): string {
  if (name !== '') {
    return name
  }
  return user
}
