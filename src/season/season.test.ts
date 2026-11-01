import { describe, expect, it } from 'vitest'
import { seasonOf, starsOf, tracksFor } from './season'

describe('seasons', () => {
  it('uses meteorological seasons', () => {
    expect(seasonOf('2026-11-01').key).toBe('autumn-2026')
    expect(seasonOf('2026-11-30').end).toBe('2026-11-30')
    expect(seasonOf('2026-12-01').key).toBe('winter-2026')
    expect(seasonOf('2027-02-14').key).toBe('winter-2026')
    expect(seasonOf('2027-02-14').end).toBe('2027-02-28')
    expect(seasonOf('2027-04-02').id).toBe('spring')
  })
  it('counts workouts and kills only inside the season', () => {
    const s = seasonOf('2026-11-01')
    const t = tracksFor(s, { days: [], workouts: { '2026-08-24': 4, '2026-11-02': 3 }, killDays: ['2026-08-31', '2026-11-01'], today: '2026-11-01' })
    expect(t.find((x) => x.id === 'train')!.value).toBe(3)
    expect(t.find((x) => x.id === 'hunt')!.value).toBe(1)
    expect(starsOf(t)).toBe(0)
  })
})
