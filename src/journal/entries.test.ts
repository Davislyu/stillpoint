import { describe, expect, it } from 'vitest'
import { buildEntries, filterEntries, flashback, journalStats, level, snippet } from './entries'

const o = (t: string, b = '') => ({ criticalThinking: t, observations: b })
const obs = {
  '2026-10-29': o('why caching helped', 'slept badly'),
  '2026-10-30': o('', 'felt calm after gym'),
  '2026-10-31': o('trade-offs of queues'),
  '2026-10-20': o('  ', ''),
  '2026-10-10': o('old idea about caching'),
}

describe('journal', () => {
  const e = buildEntries(obs)
  it('keeps only days with writing, newest first, numbered from the first day', () => {
    expect(e.map((x) => x.date)).toEqual(['2026-10-31', '2026-10-30', '2026-10-29', '2026-10-10'])
    expect(e.map((x) => x.no)).toEqual([4, 3, 2, 1])
  })
  it('searches and filters by kind', () => {
    expect(filterEntries(e, 'caching', 'all').map((x) => x.date)).toEqual(['2026-10-29', '2026-10-10'])
    expect(filterEntries(e, 'calm', 'thinking')).toHaveLength(0)
    expect(filterEntries(e, '', 'observations').map((x) => x.date)).toEqual(['2026-10-30', '2026-10-29'])
  })
  it('counts streaks, allowing today to be empty', () => {
    expect(journalStats(e, '2026-10-31')).toMatchObject({ entries: 4, streak: 3, best: 3 })
    expect(journalStats(e, '2026-11-01').streak).toBe(3)
    expect(journalStats(e, '2026-11-02').streak).toBe(0)
  })
  it('snippets show the match and heat levels bucket by length', () => {
    expect(snippet('a '.repeat(200) + 'needle' + ' b'.repeat(200), 'needle')).toContain('needle')
    expect([0, 10, 60, 200, 900].map(level)).toEqual([0, 1, 2, 3, 4])
  })
  it('finds a flashback', () => {
    expect(flashback(e, '2026-10-17')?.label).toBe('A week ago')
    expect(flashback(e, '2026-12-25')).toBeNull()
  })
})
