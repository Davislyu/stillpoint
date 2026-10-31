import { describe, expect, it } from 'vitest'
import { addDays, startOfWeek } from '../lib/date'
import type { AppState } from '../state/types'
import { computeCombat, monstersFor } from './combat'
import { computeGame } from './engine'
import { rollDrop } from './loot'
import { computeStats } from './stats'

const TODAY = '2026-10-31'
const empty = (): AppState => ({ habits: [], completions: {}, milestones: {}, observations: {}, meals: {}, workouts: {}, spendings: [] })
const hab = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `h${i}`, name: `H${i}`, accent: 'sage' as const, createdOn: addDays(TODAY, -3) }))
const fullMeals = () => Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, { isCompleted: true, notes: '' }]))
const run = (s: AppState, equipped: Record<string, string> = {}) =>
  computeCombat({ state: s, today: TODAY, stats: computeStats(s, TODAY), questsDoneByDay: new Map(), equippedIds: equipped })

describe('daily hunt', () => {
  it('a quiet day slays nothing; a full day clears all three monsters', () => {
    const s = empty()
    s.habits = hab(4)
    expect(run(s).today.fights.every((f) => !f.slain)).toBe(true)

    s.completions[TODAY] = ['h0', 'h1', 'h2', 'h3']
    s.meals[TODAY] = fullMeals()
    s.observations[TODAY] = { criticalThinking: 'word '.repeat(60), observations: 'more '.repeat(60) }
    const c = run(s)
    expect(c.today.fights.map((f) => f.slain)).toEqual([true, true, true])
    expect(c.freshKills).toEqual([`kill-${TODAY}-0`, `kill-${TODAY}-1`, `kill-${TODAY}-2`])
  })

  it('a half-decent day downs the minions but not the elite', () => {
    const s = empty()
    s.habits = hab(4)
    s.completions[TODAY] = ['h0', 'h1', 'h2', 'h3']
    s.meals[TODAY] = fullMeals()
    const c = run(s)
    expect(c.today.fights[0].slain).toBe(true)
    expect(c.today.fights[2].slain).toBe(false)
    expect(c.today.fights[2].hp).toBeLessThan(c.today.fights[2].maxHp)
  })

  it('extra spending heals the first monster', () => {
    const s = empty()
    s.habits = hab(4)
    s.completions[TODAY] = ['h0']
    const before = run(s).today.fights[0].hp
    s.spendings = [{ id: 'x', date: TODAY, amountCents: 1500, description: 'Snack', category: 'impulse' }]
    expect(run(s).today.fights[0].hp).toBe(before + 8)
  })

  it('saved kills stay slain even if the day is later edited', () => {
    const s = empty()
    s.habits = hab(1)
    s.milestones[`kill-${TODAY}-0`] = TODAY
    const c = run(s)
    expect(c.today.fights[0].slain).toBe(true)
    expect(c.freshKills).not.toContain(`kill-${TODAY}-0`)
  })
})

describe('weekly boss', () => {
  it('four workouts fell the boss', () => {
    const s = empty()
    s.habits = hab(1)
    s.workouts[startOfWeek(TODAY)] = 3
    expect(run(s).week.fight.slain).toBe(false)
    s.workouts[startOfWeek(TODAY)] = 4
    const c = run(s)
    expect(c.week.fight.slain).toBe(true)
    expect(c.week.fight.drop).not.toBeNull() // bosses always drop
    expect(['rare', 'epic', 'legendary']).toContain(c.week.fight.drop!.rarity)
  })
})

describe('loot', () => {
  it('is deterministic per kill', () => {
    expect(rollDrop('kill-2026-10-31-2', 'elite', TODAY)).toEqual(rollDrop('kill-2026-10-31-2', 'elite', TODAY))
  })
  it('has believable odds: minions sometimes drop nothing, legendaries are rare', () => {
    let none = 0
    let legendary = 0
    for (let i = 0; i < 4000; i++) {
      const d = addDays('2020-01-01', i)
      if (!rollDrop(`kill-${d}-0`, 'minion', d)) none++
      if (rollDrop(`kill-${d}-2`, 'elite', d)?.rarity === 'legendary') legendary++
    }
    expect(none / 4000).toBeGreaterThan(0.3)
    expect(none / 4000).toBeLessThan(0.5)
    expect(legendary).toBeGreaterThan(10) // ~1% of 4000
    expect(legendary).toBeLessThan(90)
  })
  it('rarer items roll more affixes', () => {
    for (let i = 0; i < 300; i++) {
      const it = rollDrop(`boss-x${i}`, 'boss', TODAY)!
      const expected = { rare: 2, epic: 3, legendary: 4 }[it.rarity as 'rare' | 'epic' | 'legendary']
      expect(it.affixes).toHaveLength(expected)
    }
  })
})

describe('gear', () => {
  it('auto-equips the strongest item and respects your choice', () => {
    const s = empty()
    s.habits = hab(1)
    // A month of saved elite kills gives a spread of items.
    for (let i = 0; i < 30; i++) s.milestones[`kill-${addDays(TODAY, -40 + i)}-2`] = addDays(TODAY, -40 + i)
    const c = run(s)
    expect(c.inventory.length).toBe(30)
    const weapons = c.inventory.filter((x) => x.slot === 'weapon')
    if (weapons.length > 1) {
      const weakest = [...weapons].sort((a, b) => a.power - b.power)[0]
      expect(run(s, { weapon: weakest.id }).equipped.weapon!.id).toBe(weakest.id)
    }
  })

  it('kills add XP and unlock hunt achievements; saved kill keys are not counted as achievements', () => {
    const s = empty()
    s.habits = hab(4)
    s.completions[TODAY] = ['h0', 'h1', 'h2', 'h3']
    s.meals[TODAY] = fullMeals()
    s.observations[TODAY] = { criticalThinking: 'word '.repeat(60), observations: '' }
    s.milestones['kill-2026-10-01-0'] = '2026-10-01'
    const g = computeGame(s, TODAY, [])
    expect(g.combat.killXp).toBeGreaterThan(0)
    expect(g.achievements.find((v) => v.a.id === 'slayer-1')!.unlocked).toBe(true)
    expect(g.unlockedCount).toBe(g.achievements.filter((v) => v.unlocked).length)
  })

  it('daily monsters are two different minions and an elite', () => {
    for (let i = 0; i < 100; i++) {
      const [a, b, e] = monstersFor(addDays(TODAY, i))
      expect(a.id).not.toBe(b.id)
      expect(e.tier).toBe('elite')
    }
  })
})
