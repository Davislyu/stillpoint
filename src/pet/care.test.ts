import { describe, expect, it } from 'vitest'
import { accessoryFor, careOf, stageFor } from './care'

const base = { mealsPerDay: 3, workoutsThisWeek: 0, weekFraction: 0.5, hour: 12, resting: false }
describe('pet care', () => {
  it('is never gloomy before the evening', () => {
    expect(careOf({ ...base, facts: undefined }).mood).toBe('ok')
  })
  it('turns wistful in the evening with nothing done', () => {
    expect(careOf({ ...base, facts: undefined, hour: 20 }).mood).toBe('sad')
  })
  it('sleeps at night and on days off', () => {
    expect(careOf({ ...base, facts: undefined, hour: 2 }).mood).toBe('sleep')
    expect(careOf({ ...base, facts: undefined, hour: 20, resting: true }).mood).toBe('ok')
  })
  it('grows with level', () => {
    expect(stageFor(1).name).toBe('Hatchling')
    expect(stageFor(30).name).toBe('Guardian')
    expect(accessoryFor(1)).toBeNull()
    expect(accessoryFor(9)).toBe('scarf')
    expect(accessoryFor(40)).toBe('crown')
  })
})
