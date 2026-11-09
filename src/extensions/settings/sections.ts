import type { NavSection, TileColor } from '@neoworks/gtk-ui'
import { arrayOf, stringListOf, stringOf } from '../../lib/record.js'

// The Settings sidebar's model: the catalog's sections, narrowed by the
// search text and grouped the way the manifests asked.

const TILE_COLORS: TileColor[] = ['blue', 'sky', 'teal', 'green', 'yellow', 'orange', 'red', 'pink', 'purple', 'grey']

export interface Section {
  id: string
  title: string
  icon: string
  color: TileColor
  view: string
  group: string
  keywords: string[]
}

export function sectionsOf(sections: unknown): Section[] {
  return arrayOf(sections).map((record) => ({
    id: stringOf(record.id),
    title: stringOf(record.title),
    icon: stringOf(record.icon),
    color: tileColorOf(record.color),
    view: stringOf(record.view),
    group: stringOf(record.group),
    keywords: stringListOf(record.keywords),
  }))
}

// An unknown colour, or none, is the neutral tile.
function tileColorOf(value: unknown): TileColor {
  const found = TILE_COLORS.find((color) => color === stringOf(value))
  if (found === undefined) {
    return 'grey'
  }
  return found
}

export function matching(sections: Section[], query: string): Section[] {
  const wanted = query.trim().toLowerCase()
  if (wanted === '') {
    return sections
  }
  return sections.filter((section) => wordsOf(section).some((word) => word.includes(wanted)))
}

// Groups keep the catalog's order: a group sits where its first section is.
export function groupsOf(sections: Section[]): Section[][] {
  const groups = new Map<string, Section[]>()
  for (const section of sections) {
    const members = groups.get(section.group)
    if (members === undefined) {
      groups.set(section.group, [section])
      continue
    }
    members.push(section)
  }
  return [...groups.values()]
}

export function navSectionsOf(sections: Section[]): NavSection[] {
  return groupsOf(sections).map((members) => ({
    items: members.map((section) => ({ id: section.id, label: section.title, icon: section.icon, color: section.color })),
  }))
}

function wordsOf(section: Section): string[] {
  return [section.title, ...section.keywords].map((word) => word.toLowerCase())
}
