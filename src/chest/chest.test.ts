import { describe, expect, it } from 'vitest'
import { chestKey, computeChests, isChestKey, rollTreasure, treasuresOf } from './chest'
import type { DayFacts } from '../game/stats'

const add = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}
const day = (date: string, share: number | null, active = true): DayFacts => ({ date, habitsDone: 1, habitsTotal: 2, share, meals: 0, mealNotes: 0, noteWords: 0, fullMeals: false, mealTarget: 3, hasNote: false, hasCritical: false, hasObservation: false, spendCount: 0, active })

describe('daily chests', () => {
  it('keys fit the milestone key rule', () => {
    expect(chestKey('2026-11-01', 2)).toMatch(/^[a-z0-9-]{1,40}$/)
    expect(isChestKey(chestKey('2026-11-01', 1))).toBe(true)
    expect(isChestKey('kill-2026-11-01-0')).toBe(false)
  })
  it('is deterministic', () => {
    const k = chestKey('2026-11-01', 1)
    expect(treasuresOf(k)).toEqual(treasuresOf(k))
    expect(treasuresOf(k)).toHaveLength(3)
  })
  it('has huge variety', () => {
    const names = new Set<string>()
    for (let i = 0; i < 4000; i++) names.add(rollTreasure(`chest-2027-01-01-t${i % 3}`, i, (i % 3) as 0 | 1 | 2).name)
    expect(names.size).toBeGreaterThan(3000)
  })
  it('gilded chests are better than wooden ones', () => {
    const score = (t: 0 | 1 | 2) => {
      let s = 0
      for (let i = 0; i < 3000; i++) s += rollTreasure(`k${i}`, 0, t).xp
      return s
    }
    expect(score(2)).toBeGreaterThan(score(0))
  })
  it('offers earned, unopened chests from the last three days', () => {
    const days = [day('2026-10-30', 1), day('2026-10-31', 0.6), day('2026-11-01', 0.1), day('2026-10-28', 1)]
    const c = computeChests({ [chestKey('2026-10-31', 1)]: '2026-10-31' }, days, '2026-11-01', add)
    expect(c.waiting.map((w) => w.date)).toEqual(['2026-11-01', '2026-10-30'])
    expect(c.waiting[1].tier).toBe(2)
    expect(c.xp).toBeGreaterThan(0)
  })
})
