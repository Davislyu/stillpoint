import { describe, expect, it } from 'vitest'
import { summarizeWeek } from '../dashboard/week'
import { computeStats } from '../game/stats'
import { monthJustifiedCents, monthTotalCents } from './selectors'
import type { AppState } from './types'

const today = '2026-10-31'
const mk = (justified: boolean) =>
  ({
    habits: [{ id: 'h', name: 'Gym', accent: 'clay', createdOn: '2026-10-26', archivedOn: null }],
    completions: { '2026-10-26': ['h'], '2026-10-27': ['h'], '2026-10-28': ['h'] },
    milestones: {}, observations: {}, meals: {}, workouts: {},
    spendings: [
      { id: 'x', date: '2026-10-27', amountCents: 99000, description: 'Arnona', category: 'other', justified },
      { id: 'y', date: '2026-10-26', amountCents: 1000, description: 'Coffee', category: 'coffee', justified: false },
    ],
  }) as unknown as AppState

describe('justified payments', () => {
  it('are tracked separately and left out of the extras total', () => {
    const s = mk(true)
    expect(monthTotalCents(s, '2026-10')).toBe(1000)
    expect(monthJustifiedCents(s, '2026-10')).toBe(99000)
  })
  it('do not break a no-spend day, but ordinary extras do', () => {
    expect(computeStats(mk(true), today).noSpendDays).toBeGreaterThan(computeStats(mk(false), today).noSpendDays)
  })
  it('stay out of the weekly recap', () => {
    expect(summarizeWeek(mk(true), today).extrasCents).toBe(1000)
    expect(summarizeWeek(mk(false), today).extrasCents).toBe(100000)
  })
})
