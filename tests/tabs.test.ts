import { describe, it, expect } from 'vitest'
import { TABS, SETTINGS_TAB, tabSlug, tabFromSlug, tabLabel } from '@/components/dashboard/tabs'

// The dashboard used to hold its section in useState(0), so a refresh always
// dropped you on Home. The slug now rides in ?tab= and is resolved server-side.
describe('tab slugs', () => {
  it('round-trips every real tab', () => {
    for (const t of TABS) {
      const slug = tabSlug(t.id)
      expect(slug, `no slug for ${t.label}`).toBeTruthy()
      expect(tabFromSlug(slug)).toEqual({ id: t.id, settings: false })
    }
  })

  it('produces unique slugs, so no two sections collide', () => {
    const slugs = TABS.map(t => tabSlug(t.id))
    expect(new Set(slugs).size).toBe(TABS.length)
  })

  it('keeps Trading on Trading — the case Marco hit', () => {
    const trading = TABS.find(t => t.label === 'Trading')!
    expect(tabSlug(trading.id)).toBe('trading')
    expect(tabFromSlug('trading').id).toBe(trading.id)
  })

  it('round-trips settings, which is not a numbered tab', () => {
    expect(tabSlug(SETTINGS_TAB)).toBe('settings')
    expect(tabFromSlug('settings')).toEqual({ id: 0, settings: true })
  })

  it('falls back to Home rather than a blank shell', () => {
    for (const bad of [null, undefined, '', '   ', 'nope', 'trading; drop table']) {
      expect(tabFromSlug(bad)).toEqual({ id: 0, settings: false })
    }
  })

  it('is case- and whitespace-insensitive on the way in', () => {
    expect(tabFromSlug('  TRADING  ').id).toBe(1)
    expect(tabFromSlug('Analyst').id).toBe(6)
  })

  it('still labels sections the way the top bar expects', () => {
    expect(tabLabel(1, false)).toBe('Trading')
    expect(tabLabel(1, true)).toBe('Settings')
  })
})
