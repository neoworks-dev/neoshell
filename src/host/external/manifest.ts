import type { ClientPermissions } from '../clients/permissions.js'

// The manifest an installed program ships to put widgets on the shell, in
// <data dir>/neoshell/extensions/<id>/manifest.json next to its client.js.
// Its data comes from the program itself over D-Bus (dbusSource.ts), so all
// it may touch on the bus is its own namespace, ext.<id>.*: the topics and
// calls it lists here.
//
// The id is reverse-DNS ("dev.neoworks.agents"), so it can never be a
// built-in extension's, whose ids have no dots.

export interface ExternalWidget {
  view: string
  name: string
  category: string
  // A theme icon name, or ''.
  icon: string
  description: string
  sizes: string[]
  defaultSize: string
}

export interface ExternalManifest {
  id: string
  name: string
  // The well-known D-Bus name the program owns and serves WidgetSource1 on.
  dbus: string
  topics: string[]
  calls: string[]
  widgets: ExternalWidget[]
}

export type ParsedManifest = { ok: true; manifest: ExternalManifest } | { ok: false; error: string }

const ID_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/
const DBUS_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*(\.[A-Za-z_][A-Za-z0-9_-]*)+$/
// No dots and no "*", so a topic or call can never widen into a pattern.
const MEMBER_PATTERN = /^[a-z][A-Za-z0-9_]*$/
const ICON_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/
const WIDGET_SIZES = ['small', 'medium', 'large']
const MAX_DBUS_NAME = 255
const MAX_NAME = 60
const MAX_DESCRIPTION = 200
const MAX_MEMBERS = 32

export function topicOf(id: string, topic: string): string {
  return `ext.${id}.${topic}`
}

export function commandOf(id: string, call: string): string {
  return `ext.${id}:${call}`
}

// Retained by the shell, not the program: {available} — whether the program
// is on the bus now. What it last published stays retained while it is gone.
export function sourceTopicOf(id: string): string {
  return topicOf(id, 'source')
}

export function widgetTypeOf(id: string, view: string): string {
  return `${id}.${view}`
}

export function externalPermissions(manifest: ExternalManifest): ClientPermissions {
  const topics = manifest.topics.map((topic) => topicOf(manifest.id, topic))
  return {
    subscribe: [...topics, sourceTopicOf(manifest.id)],
    call: manifest.calls.map((call) => commandOf(manifest.id, call)),
    publish: [],
    configKeys: [],
  }
}

export function parseExternalManifest(value: unknown): ParsedManifest {
  const record = recordOf(value)
  const id = stringOf(record.id)
  if (!ID_PATTERN.test(id)) {
    return refuse(`id "${id}" is not a lowercase reverse-DNS name`)
  }
  const dbus = stringOf(record.dbus)
  if (dbus.length > MAX_DBUS_NAME || !DBUS_NAME_PATTERN.test(dbus)) {
    return refuse(`dbus "${dbus}" is not a well-known D-Bus name`)
  }
  const name = stringOf(record.name)
  if (name === '' || name.length > MAX_NAME) {
    return refuse('name is missing or too long')
  }
  return parseMembers(record, { id, name, dbus })
}

function parseMembers(record: Record<string, unknown>, head: Pick<ExternalManifest, 'id' | 'name' | 'dbus'>): ParsedManifest {
  const topics = membersOf(record.topics)
  const calls = membersOf(record.calls)
  if (topics === null || calls === null) {
    return refuse('topics and calls must be lists of plain names')
  }
  if (topics.includes('source')) {
    return refuse('"source" is the shell\'s own topic')
  }
  const widgets = widgetsOf(record.widgets)
  if (typeof widgets === 'string') {
    return refuse(widgets)
  }
  return { ok: true, manifest: { ...head, topics, calls, widgets } }
}

function membersOf(value: unknown): string[] | null {
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value) || value.length > MAX_MEMBERS) {
    return null
  }
  const members = value.filter((member): member is string => typeof member === 'string' && MEMBER_PATTERN.test(member))
  if (members.length !== value.length) {
    return null
  }
  return members
}

// The widgets, or what is wrong with them.
function widgetsOf(value: unknown): ExternalWidget[] | string {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MEMBERS) {
    return 'widgets must be a non-empty list'
  }
  const widgets: ExternalWidget[] = []
  for (const entry of value) {
    const widget = widgetOf(recordOf(entry))
    if (typeof widget === 'string') {
      return widget
    }
    widgets.push(widget)
  }
  return widgets
}

function widgetOf(record: Record<string, unknown>): ExternalWidget | string {
  const view = stringOf(record.view)
  if (!MEMBER_PATTERN.test(view)) {
    return `widget view "${view}" is not a plain name`
  }
  const name = stringOf(record.name)
  const description = stringOf(record.description)
  if (name === '' || name.length > MAX_NAME || description.length > MAX_DESCRIPTION) {
    return `widget "${view}" needs a short name and description`
  }
  const sizes = sizesOf(record.sizes)
  const defaultSize = stringOf(record.defaultSize)
  if (sizes.length === 0 || !sizes.includes(defaultSize)) {
    return `widget "${view}" needs sizes (${WIDGET_SIZES.join(', ')}) holding its defaultSize`
  }
  return { view, name, category: categoryOf(record.category), icon: iconOf(record.icon), description, sizes, defaultSize }
}

function iconOf(value: unknown): string {
  const icon = stringOf(value)
  if (!ICON_PATTERN.test(icon)) {
    return ''
  }
  return icon
}

function sizesOf(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return WIDGET_SIZES.filter((size) => value.includes(size))
}

function categoryOf(value: unknown): string {
  const category = stringOf(value)
  if (category === '' || category.length > MAX_NAME) {
    return 'Other'
  }
  return category
}

function refuse(error: string): ParsedManifest {
  return { ok: false, error }
}

function recordOf(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function stringOf(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  return value
}
