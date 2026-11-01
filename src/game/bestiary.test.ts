import { describe, expect, it } from 'vitest'
import { ALL_MONSTERS, ELITES, MINIONS, NEW_ERA } from './bestiary'
import { bossFor, monstersFor } from './combat'
import { hash } from './stats'

describe('bestiary growth', () => {
  it('keeps every earlier day on its original monsters', () => {
    for (const d of ['2026-10-01', '2026-10-31', '2026-11-01']) {
      const [a, , e] = monstersFor(d)
      expect(MINIONS.map((m) => m.id)).toContain(a.id)
      expect(e).toBe(ELITES[hash(`${d}:e`) % ELITES.length])
    }
    expect(bossFor('2026-10-26').region).toBe('ravenmoor')
  })
  it('lets new monsters appear from the new era', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 120; i++) {
      const d = `2027-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`
      expect(d >= NEW_ERA).toBe(true)
      monstersFor(d).forEach((m) => seen.add(m.region))
    }
    expect(seen.size).toBeGreaterThan(1)
  })
  it('has unique ids and lore for all', () => {
    expect(new Set(ALL_MONSTERS.map((m) => m.id)).size).toBe(ALL_MONSTERS.length)
    for (const m of ALL_MONSTERS) expect(m.lore.length).toBeGreaterThan(20)
  })
})
