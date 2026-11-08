import type { NotchWidgetDeclaration } from '../index.js'
import { arrayOf, numberOf, stringOf } from '../../lib/record.js'

// The Nook: the row of widgets the open notch shows. Which widgets, in which
// order and how wide is config's answer under notch.nook; the catalog
// (notch.catalog) says what exists. Pure functions, shared by the notch and
// its settings page.
//
//   notch.nook  [{type, enabled, cells}]

export interface NookEntry {
  type: string
  enabled: boolean
  cells: number
}

export const NOOK_KEY = 'notch.nook'
export const CELL_WIDTH = 56
export const NOOK_ROW_HEIGHT = 112
// The divider between two widgets, with its margins.
export const NOOK_DIVIDER_WIDTH = 25

// Config order first, then whatever the catalog has that config does not.
// A Nook that has never been configured shows every widget; once it has, a
// widget installed later starts switched off rather than reshuffling it.
export function nookEntries(
  catalog: NotchWidgetDeclaration[],
  configured: unknown,
): NookEntry[] {
  const known = new Map(catalog.map((widget) => [widget.type, widget]))
  const fromConfig = configuredEntries(configured, known)
  const hasConfig = Array.isArray(configured)
  const missing = catalog.filter(
    (widget) => !fromConfig.some((entry) => entry.type === widget.type),
  )
  return [...fromConfig, ...missing.map((widget) => defaultEntry(widget, !hasConfig))]
}

export function enabledEntries(entries: NookEntry[]): NookEntry[] {
  return entries.filter((entry) => entry.enabled)
}

export function widgetWidth(cells: number): number {
  return cells * CELL_WIDTH
}

// The content width of the Nook row: every enabled widget plus a divider
// between each pair.
export function nookWidth(entries: NookEntry[]): number {
  const enabled = enabledEntries(entries)
  const widgets = enabled.reduce((total, entry) => total + widgetWidth(entry.cells), 0)
  const dividers = Math.max(enabled.length - 1, 0) * NOOK_DIVIDER_WIDTH
  return widgets + dividers
}

export function clampCells(widget: NotchWidgetDeclaration, cells: number): number {
  return Math.min(Math.max(Math.round(cells), widget.minCells), widget.maxCells)
}

export function withEntry(entries: NookEntry[], changed: NookEntry): NookEntry[] {
  return entries.map((entry) => {
    if (entry.type !== changed.type) {
      return entry
    }
    return changed
  })
}

// Moves one entry by `offset` places, clamped to the list.
export function moved(entries: NookEntry[], type: string, offset: number): NookEntry[] {
  const from = entries.findIndex((entry) => entry.type === type)
  if (from === -1) {
    return entries
  }
  const to = Math.min(Math.max(from + offset, 0), entries.length - 1)
  const reordered = [...entries]
  const [entry] = reordered.splice(from, 1)
  reordered.splice(to, 0, entry)
  return reordered
}

function configuredEntries(
  configured: unknown,
  known: Map<string, NotchWidgetDeclaration>,
): NookEntry[] {
  const entries: NookEntry[] = []
  for (const record of arrayOf(configured)) {
    const widget = known.get(stringOf(record.type))
    if (widget === undefined || entries.some((entry) => entry.type === widget.type)) {
      continue
    }
    entries.push({
      type: widget.type,
      enabled: record.enabled !== false,
      cells: clampCells(widget, numberOf(record.cells, widget.defaultCells)),
    })
  }
  return entries
}

function defaultEntry(widget: NotchWidgetDeclaration, enabled: boolean): NookEntry {
  return { type: widget.type, enabled, cells: widget.defaultCells }
}
