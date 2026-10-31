import { describe, expect, it } from 'vitest'
import { AURA_BY_ID, aurasFor, isAdmin, layoutFromAura, normalizeLayout, visibleTabs } from './layout'

describe('auras and layout', () => {
  it('offers the founder aura only to the admin account', () => {
    expect(isAdmin('DavisLyu@gmail.com')).toBe(true)
    expect(aurasFor('davislyu@gmail.com').some((a) => a.adminOnly)).toBe(true)
    expect(aurasFor('someone@else.com').some((a) => a.adminOnly)).toBe(false)
    expect(aurasFor(null).length).toBe(7)
  })
  it('drops tabs whose panels are all hidden; featured panels move to Today', () => {
    const queen = layoutFromAura(AURA_BY_ID['money-saver-queen'], 'u')
    expect(visibleTabs(queen)).not.toContain('money')
    expect(visibleTabs(layoutFromAura(AURA_BY_ID['lord-of-ravenmoor'], 'u'))).toEqual(['today', 'body', 'notes', 'money', 'hero'])
  })
  it('rejects malformed layouts and unknown panels', () => {
    expect(normalizeLayout({ aura: 'nope', owner: 'u' })).toBeNull()
    expect(normalizeLayout({ aura: 'iron-monk', owner: 'u', hidden: ['hunt', 'bogus'], featured: 'x' })).toEqual({
      aura: 'iron-monk', owner: 'u', hidden: ['hunt'], featured: null,
    })
  })
})

describe('layout rules', () => {
  it('never lets Daily habits be hidden, even from an old saved layout', () => {
    expect(normalizeLayout({ aura: 'iron-monk', owner: 'u', hidden: ['habits', 'quests'], featured: null })?.hidden).toEqual(['quests'])
  })
  it('keeps workouts on while the hunt is on', () => {
    expect(normalizeLayout({ aura: 'iron-monk', owner: 'u', hidden: ['workouts'], featured: null })?.hidden).toEqual([])
    expect(normalizeLayout({ aura: 'iron-monk', owner: 'u', hidden: ['workouts', 'hunt'], featured: null })?.hidden.sort()).toEqual(['hunt', 'workouts'])
  })
})
