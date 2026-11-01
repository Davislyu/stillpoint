import { describe, expect, it } from 'vitest'
import { dayFacts } from '../game/stats'
import { mealSlots, mealsDone } from './selectors'
import type { AppState } from './types'

const base = (mealsPerDay: number): AppState => ({
  habits: [], completions: {}, milestones: {}, observations: {}, workouts: {}, spendings: [], notes: [], exercises: [], mealsPerDay, restDays: {},
  meals: { '2026-10-31': { 1: { isCompleted: true, notes: '' }, 2: { isCompleted: true, notes: '' }, 3: { isCompleted: true, notes: '' }, 5: { isCompleted: true, notes: '' } } },
})

describe('meals per day', () => {
  it('only counts the planned slots', () => {
    expect(mealSlots(base(3))).toEqual([1, 2, 3])
    expect(mealsDone(base(3), '2026-10-31')).toBe(3)
    expect(mealsDone(base(5), '2026-10-31')).toBe(4)
  })
  it('a full day is every planned meal', () => {
    expect(dayFacts(base(3), '2026-10-31', new Map()).fullMeals).toBe(true)
    expect(dayFacts(base(5), '2026-10-31', new Map()).fullMeals).toBe(false)
  })
})
