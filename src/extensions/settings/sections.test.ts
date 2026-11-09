import { describe, expect, test } from 'bun:test'
import { groupsOf, navSectionsOf, sectionsOf } from './sections'

describe('sectionsOf', () => {
  test('keeps a known tile colour and greys out the rest', () => {
    const sections = sectionsOf([
      { id: 'weather', color: 'sky' },
      { id: 'notch', color: 'mauve' },
      { id: 'email' },
    ])
    expect(sections.map((section) => section.color)).toEqual(['sky', 'grey', 'grey'])
  })
})

describe('groupsOf', () => {
  test('groups sit where their first section is', () => {
    const sections = sectionsOf([
      { id: 'notch', group: 'shell' },
      { id: 'displays', group: 'system' },
      { id: 'calendar', group: 'shell' },
    ])
    const ids = groupsOf(sections).map((group) => group.map((section) => section.id))
    expect(ids).toEqual([['notch', 'calendar'], ['displays']])
  })
})

describe('navSectionsOf', () => {
  test('hands each section to the drawer with its tile colour', () => {
    const groups = navSectionsOf(sectionsOf([{ id: 'weather', title: 'Weather', icon: 'weather-few-clouds-symbolic', color: 'sky' }]))
    expect(groups).toEqual([
      { items: [{ id: 'weather', label: 'Weather', icon: 'weather-few-clouds-symbolic', color: 'sky' }] },
    ])
  })
})
