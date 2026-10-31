import { describe, expect, it } from 'vitest'
import { addDays } from '../lib/date'
import { streakInfo } from './selectors'
import type { AppState } from './types'

const base = (days: number, doneOn: (i: number) => boolean) => {
  const today = '2026-10-31'
  const start = addDays(today, -days + 1)
  const s = {
    habits: [{ id: 'h', name: 'Gym', accent: 'clay', createdOn: start, archivedOn: null }],
    completions: {} as Record<string, string[]>,
  } as unknown as AppState
  for (let i = 0; i < days; i++) if (doneOn(i)) s.completions[addDays(start, i)] = ['h']
  return { s, today }
}

describe('streak shields', () => {
  it('earns a shield every 7 days and spends it on a miss instead of resetting', () => {
    const { s, today } = base(10, (i) => i !== 8) // 7 done, 1 shield, miss day 8, done day 9
    const r = streakInfo(s, today)
    expect(r.shields).toBe(0)
    expect(r.savedDays).toHaveLength(1)
    expect(r.streak).toBe(9)
    expect(r.lastBreak).toBeNull()
  })
  it('resets when there is no shield and remembers the break', () => {
    const { s, today } = base(6, (i) => i !== 4)
    const r = streakInfo(s, today)
    expect(r.streak).toBe(1)
    expect(r.lastBreak?.lost).toBe(4)
  })
  it('does not break the streak while today is unfinished', () => {
    const { s, today } = base(5, (i) => i < 4)
    expect(streakInfo(s, today).streak).toBe(4)
  })
  it('caps banked shields at two', () => {
    const { s, today } = base(30, () => true)
    expect(streakInfo(s, today).shields).toBe(2)
  })
})
