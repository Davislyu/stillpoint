import { describe, expect, it } from 'vitest'
import type { Spending } from '../state/types'
import { daysInMonth, monthReport, trend, weekdayAverages } from './analytics'

const s = (id: string, date: string, amountCents: number, category: Spending['category'] = 'coffee', justified = false): Spending => ({ id, date, amountCents, description: id, category, justified })
const all = [
  s('a', '2026-10-02', 1000),
  s('b', '2026-10-02', 500, 'groceries', true),
  s('c', '2026-10-10', 2500, 'bills', true),
  s('d', '2026-10-31', 700, 'coffee'),
  s('e', '2026-09-15', 4000),
]

describe('spending analytics', () => {
  it('knows month lengths', () => expect([daysInMonth('2026-02'), daysInMonth('2026-10')]).toEqual([28, 31]))
  it('splits counted and justified, by day and category', () => {
    const r = monthReport(all, '2026-10', '2026-10-31')
    expect(r).toMatchObject({ counted: 1700, justified: 3000, count: 4 })
    expect(r.days[1]).toMatchObject({ day: 2, counted: 1000, justified: 500 })
    expect(r.categories.map((c) => c.id)).toEqual(['bills', 'coffee', 'groceries'])
    expect(r.biggest?.id).toBe('c')
    expect(r.perDay).toBe(Math.round(4700 / 31))
    expect(r.cumulative[30]).toBe(4700)
  })
  it('averages only elapsed days of the current month', () => {
    expect(monthReport(all, '2026-10', '2026-10-10').perDay).toBe(Math.round(4700 / 10))
    expect(monthReport(all, '2026-11', '2026-10-31').perDay).toBe(0)
  })
  it('builds a six-month trend', () => {
    const t = trend(all, '2026-10')
    expect(t).toHaveLength(6)
    expect(t[0].month).toBe('2026-05')
    expect(t[4]).toMatchObject({ month: '2026-09', counted: 4000 })
  })
  it('averages by weekday', () => {
    // 2026-10-31 is a Saturday (index 5)
    expect(weekdayAverages(all, '2026-10-31', 1)[5]).toBe(700)
  })
})
