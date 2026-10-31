import { describe, expect, it } from 'vitest'
import { addMonths, daysBetween, monthOf, startOfWeek } from './date'
import { looksEssential, parseAmountToCents } from './money'

describe('dates', () => {
  it('weeks start on Monday (matches the database check)', () => {
    expect(startOfWeek('2026-10-31')).toBe('2026-10-26') // Saturday → Monday
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26') // Sunday stays in the same week
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26')
  })
  it('counts days across month ends correctly (v1 bug regression)', () => {
    expect(daysBetween('2026-10-31', '2026-11-09')).toBe(9)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })
  it('steps months across years', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(monthOf('2026-10-31')).toBe('2026-10')
  })
})

describe('money', () => {
  it('parses everyday amount formats to cents', () => {
    expect(parseAmountToCents('4.5')).toBe(450)
    expect(parseAmountToCents('$12')).toBe(1200)
    expect(parseAmountToCents('3,99')).toBe(399)
    expect(parseAmountToCents('0')).toBeNull()
    expect(parseAmountToCents('1.234')).toBeNull()
    expect(parseAmountToCents('abc')).toBeNull()
  })
  it('turns away essential costs', () => {
    expect(looksEssential('Weekly groceries')).toBe(true)
    expect(looksEssential('Electricity bill')).toBe(true)
    expect(looksEssential('Rent')).toBe(true)
    expect(looksEssential('Flat white')).toBe(false)
    expect(looksEssential('Parent gift')).toBe(false) // "rent" inside a word is fine
  })
})
