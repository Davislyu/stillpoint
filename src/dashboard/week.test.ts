import { describe, expect, it } from 'vitest'
import type { AppState } from '../state/types'
import { shareText, summarizeWeek } from './week'

// Saturday 31 Oct 2026; its week starts Monday 26 Oct.
const today = '2026-10-31'
const state = {
  habits: [{ id: 'a', name: 'Gym', accent: 'clay', createdOn: '2026-10-20', archivedOn: null }, { id: 'b', name: 'Read', accent: 'sage', createdOn: '2026-10-20', archivedOn: null }],
  completions: { '2026-10-26': ['a', 'b'], '2026-10-27': ['a'], '2026-10-28': [], '2026-10-30': ['b'] },
  milestones: { 'kill-2026-10-26-0': '2026-10-26', 'kill-2026-10-26-2': '2026-10-26', 'boss-2026-10-30': '2026-10-30', 'kill-2026-10-20-0': '2026-10-20' },
  observations: { '2026-10-27': { criticalThinking: 'x', observations: '' } },
  meals: { '2026-10-26': { 1: { isCompleted: true, notes: '' } } },
  workouts: { '2026-10-26': 3 },
  spendings: [{ id: 's', date: '2026-10-28', amountCents: 450, description: 'Coffee', category: 'coffee' }],
} as unknown as AppState

describe('summarizeWeek', () => {
  const w = summarizeWeek(state, today)
  it('counts strong days, perfect days and ticks', () => {
    expect(w.habitDays).toBe(3) // Mon 100%, Tue 50%, Fri 50%
    expect(w.perfectDays).toBe(1)
    expect(w.ticks).toBe(4)
  })
  it('counts only this week’s kills, with the elite and boss separate', () => {
    expect(w.kills).toEqual({ minion: 1, elite: 1, boss: 1 })
  })
  it('counts no-spend days among past days only', () => {
    expect(w.extrasCents).toBe(450)
    expect(w.noSpendDays).toBe(4) // Mon, Tue, Thu, Fri (Wed spent; Sat is today)
  })
  it('reads workouts and writes shareable text', () => {
    expect(w.workouts).toBe(3)
    expect(shareText(w, (c) => `$${c / 100}`, 'Sam')).toContain('Monsters slain: 3 (the weekly boss fell)')
  })
})
