import { describe, expect, it } from 'vitest'
import { arrangementFrom, AURA_BY_ID, layoutFromAura, normalizeLayout, PANEL_IDS } from './layout'

const base = layoutFromAura(AURA_BY_ID['neon-netrunner'], 'u1')

describe('arranged layouts', () => {
  it('starts from the classic layout: every panel, wide beside side', () => {
    const a = arrangementFrom(base)
    expect([...a.order].sort()).toEqual([...PANEL_IDS].sort())
    expect(a.order[0]).toBe('stats')
    expect(a.sizes.stats?.w).toBe(12)
    expect(a.sizes.hero?.w).toBe(4)
    expect(a.sizes.habits?.w).toBe(8)
  })
  it('cleans saved order and sizes', () => {
    const n = normalizeLayout({ ...base, order: ['hero', 'hero', 'nope', 'habits'], sizes: { habits: { w: 99, h: -4 }, hero: { w: 1, h: 400.4 }, bogus: { w: 6 } } })!
    expect(n.order![0]).toBe('hero')
    expect(n.order!.filter((x) => x === 'hero')).toHaveLength(1)
    expect(n.order).toHaveLength(PANEL_IDS.length)
    expect(n.sizes).toEqual({ habits: { w: 12 }, hero: { w: 3, h: 400 } })
  })
  it('keeps the classic layout when nothing was arranged', () => {
    const n = normalizeLayout(base)!
    expect(n.order).toBeUndefined()
    expect(n.sizes).toBeUndefined()
  })
})
