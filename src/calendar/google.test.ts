import { describe, expect, it } from 'vitest'
import { eventBody } from './google'

describe('calendar event body', () => {
  it('uses local wall-clock time with the browser time zone, and tags Stillpoint events', () => {
    const b = eventBody({ title: 'Workout', start: new Date(2026, 10, 2, 18, 30), minutes: 90, repeat: 'weekly', kind: 'workout' })
    expect(b.start.dateTime).toBe('2026-11-02T18:30:00')
    expect(b.end.dateTime).toBe('2026-11-02T20:00:00')
    expect(b.start.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(b.recurrence).toEqual(['RRULE:FREQ=WEEKLY'])
    expect(b.extendedProperties.private.stillpoint).toBe('workout')
  })
  it('one-off events have no recurrence', () => {
    expect(eventBody({ title: 'x', start: new Date(), minutes: 15, repeat: 'none', kind: 'custom' }).recurrence).toBeUndefined()
  })
})
