import { arrayOf, numberOf, stringOf } from '../../lib/record.js'

// The bar's status area as data: the items every manifest declares
// (status.catalog), and the bus messages that open their menus.
//
//   status:toggle  {id, monitor, anchorEnd}   open the item's menu, or close it
//   status:close   {}                          close whatever menu is open
//   status.open    {id, monitor}               retained: the open menu, if any
//
// anchorEnd is the distance from the icon's right edge to the bar's, which is
// where the dropdown box hangs from: the bar and the menu host both span
// their output, so the distance carries over.

export interface StatusItem {
  id: string
  label: string
  icon: string
  menu: string
  // A retained topic that must have data before the item shows, or ''.
  when: string
}

export interface OpenMenu {
  id: string
  monitor: string
  anchorEnd: number
}

export const NO_MENU: OpenMenu = { id: '', monitor: '', anchorEnd: 0 }

export function statusItemsOf(items: unknown): StatusItem[] {
  return arrayOf(items).map((record) => ({
    id: stringOf(record.id),
    label: stringOf(record.label),
    icon: stringOf(record.icon),
    menu: stringOf(record.menu),
    when: stringOf(record.when),
  }))
}

export function openMenuOf(record: Record<string, unknown>): OpenMenu {
  return {
    id: stringOf(record.id),
    monitor: stringOf(record.monitor),
    anchorEnd: numberOf(record.anchorEnd, 0),
  }
}
