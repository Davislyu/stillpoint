import { describe, expect, it } from 'vitest'
import { addRest, endRest, normRestDays, restRun } from './rest'
import { currentStreak, streakInfo } from './selectors'
import type { AppState } from './types'

const base = (restDays: AppState['restDays'], doneDays: string[]): AppState => ({
  habits: [{ id: 'h', name: 'Gym', accent: 'clay', createdOn: '2026-10-01' }],
  completions: Object.fromEntries(doneDays.map((d) => [d, ['h']])),
  milestones: {}, observations: {}, meals: {}, workouts: {}, spendings: [], notes: [], exercises: [], mealsPerDay: 5, restDays,
})
const run = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `2026-10-${String(from + i).padStart(2, '0')}`)

describe('days off', () => {
  it('a day off neither breaks nor adds to the streak', () => {
    const done = [...run(1, 4), ...run(7, 10)] // 5th and 6th missed
    expect(currentStreak(base({}, done), '2026-10-10')).toBe(4)
    expect(currentStreak(base({ '2026-10-05': 'sick', '2026-10-06': 'sick' }, done), '2026-10-10')).toBe(8)
  })
  it('does not spend a shield on a day off', () => {
    const done = [...run(1, 8), ...run(10, 12)] // 7 days earns a shield; the 9th is missed
    const withShield = streakInfo(base({}, done), '2026-10-12')
    expect(withShield.savedDays).toEqual(['2026-10-09'])
    const off = streakInfo(base({ '2026-10-09': 'holiday' }, done), '2026-10-12')
    expect(off.savedDays).toEqual([])
    expect(off.streak).toBe(11)
  })
  it('adds, reads and ends a run of days', () => {
    const d = addRest({}, '2026-10-05', 3, 'holiday')
    expect(Object.keys(d)).toHaveLength(3)
    expect(restRun(d, '2026-10-06')).toEqual({ n: 2, of: 3 })
    expect(endRest(d, '2026-10-06')).toEqual({ '2026-10-05': 'holiday' })
  })
  it('cleans junk from saved preferences', () => {
    expect(normRestDays({ '2026-10-05': 'sick', nope: 'sick', '2026-10-06': 'bogus' })).toEqual({ '2026-10-05': 'sick' })
  })
})
