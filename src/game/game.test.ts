import { describe, expect, it } from 'vitest'
import { addDays } from '../lib/date'
import type { AppState } from '../state/types'
import { ACHIEVEMENTS, RARITIES } from './achievements'
import { computeGame, levelFromXp, questsFor, xpForLevel } from './engine'

const empty = (): AppState => ({ habits: [], completions: {}, milestones: {}, observations: {}, meals: {}, workouts: {}, spendings: [], mealsPerDay: 5, notes: [], exercises: [] })
const TODAY = '2026-10-31'

describe('achievement catalog', () => {
  it('has 338 achievements (301 + 37 hunt) with unique, database-safe ids', () => {
    expect(ACHIEVEMENTS).toHaveLength(338)
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(338)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,40}$/) // milestones.milestone_key check
    expect(new Set(ACHIEVEMENTS.map((a) => a.name)).size).toBe(338)
    expect(ACHIEVEMENTS.find((a) => a.name === 'Completionist')!.target).toBe(337)
  })
  it('keeps the v2 streak milestone ids so earned badges carry over', () => {
    for (const id of ['streak-3', 'streak-7', 'streak-14', 'streak-30']) expect(ids()).toContain(id)
  })
  it('spans every rarity', () => {
    for (const r of RARITIES) expect(ACHIEVEMENTS.some((a) => a.rarity === r)).toBe(true)
  })
})
const ids = () => ACHIEVEMENTS.map((a) => a.id)

describe('levels', () => {
  it('uses a gentle quadratic curve', () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(100)
    expect(xpForLevel(10)).toBe(4500)
    expect(levelFromXp(0).level).toBe(1)
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(4500).level).toBe(10)
    expect(levelFromXp(4499).level).toBe(9)
  })
})

describe('game state', () => {
  it('a brand-new account is level 1 with nothing unlocked', () => {
    const g = computeGame(empty(), TODAY, ['stillpoint'])
    expect(g.level.level).toBe(1)
    expect(g.unlockedCount).toBe(0)
    expect(g.todayQuests).toHaveLength(3)
  })

  it('a week of perfect days earns XP, quests and the right achievements', () => {
    const s = empty()
    s.habits = [{ id: 'h1', name: 'Gym', accent: 'sage', createdOn: addDays(TODAY, -6) }, { id: 'h2', name: 'Drink 3L water', accent: 'teal', createdOn: addDays(TODAY, -6) }]
    for (let i = 0; i < 7; i++) {
      const d = addDays(TODAY, -i)
      s.completions[d] = ['h1', 'h2']
      s.meals[d] = { 1: { isCompleted: true, notes: 'oats' }, 2: { isCompleted: true, notes: '' }, 3: { isCompleted: true, notes: '' }, 4: { isCompleted: true, notes: '' }, 5: { isCompleted: true, notes: '' } }
    }
    s.workouts['2026-10-26'] = 4
    s.milestones['streak-3'] = '2026-10-27' // earned in v2: stays unlocked
    const g = computeGame(s, TODAY, ['stillpoint', 'geek'])
    const has = (id: string) => g.achievements.find((v) => v.a.id === id)!.unlocked
    expect(has('streak-7')).toBe(true)
    expect(has('perfect-7')).toBe(true)
    expect(has('five-a-day-7')).toBe(true)
    expect(has('full-week-1')).toBe(true)
    expect(has('theme-geek-1')).toBe(true)
    expect(has('streak-14')).toBe(false)
    expect(g.freshIds).not.toContain('streak-3') // already saved
    expect(g.freshIds).toContain('streak-7')
    expect(g.level.level).toBeGreaterThan(5)
    expect(g.cls).not.toBe('Adventurer')
    // Meta achievements see the final XP.
    expect(has('level-5')).toBe(g.level.level >= 5)
  })

  it('daily quests are stable for a date and vary across dates', () => {
    expect(questsFor(TODAY).map((q) => q.id)).toEqual(questsFor(TODAY).map((q) => q.id))
    const sets = new Set(Array.from({ length: 10 }, (_, i) => questsFor(addDays(TODAY, i)).map((q) => q.id).join()))
    expect(sets.size).toBeGreaterThan(1)
  })

  it('"no extras today" stays pending until the day is over', () => {
    const s = empty()
    s.habits = [{ id: 'h', name: 'x', accent: 'sage', createdOn: TODAY }]
    s.completions[TODAY] = ['h']
    let date = TODAY
    for (let i = 0; i < 60 && !questsFor(date).some((q) => q.id === 'nospend'); i++) date = addDays(date, 1)
    s.habits[0].createdOn = date
    s.completions = { [date]: ['h'] }
    const g = computeGame(s, date, [])
    const q = g.todayQuests.find((r) => r.quest.id === 'nospend')!
    expect(q.done).toBe(false)
    expect(q.pending).toBe(true)
  })
})
