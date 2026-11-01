import { addDays } from '../lib/date'
import type { DateKey, RestReason } from './types'

export const REST_REASONS: { id: RestReason; label: string }[] = [
  { id: 'sick', label: 'Sick' },
  { id: 'holiday', label: 'Holiday' },
  { id: 'travel', label: 'Travel' },
  { id: 'rest', label: 'Rest' },
  { id: 'other', label: 'Other' },
]
export const restLabel = (r: RestReason) => REST_REASONS.find((x) => x.id === r)?.label ?? 'Day off'
export const isRestReason = (v: unknown): v is RestReason => REST_REASONS.some((r) => r.id === v)

const KEY = /^\d{4}-\d{2}-\d{2}$/
/** Keeps only valid entries, newest 400, so the saved preference can never grow without bound. */
export function normRestDays(raw: unknown): Record<DateKey, RestReason> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const entries = Object.entries(raw as Record<string, unknown>).filter(([d, r]) => KEY.test(d) && isRestReason(r)) as [DateKey, RestReason][]
  return Object.fromEntries(entries.sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 400))
}

/** Marks `count` consecutive days off, starting on `from`. */
export function addRest(days: Record<DateKey, RestReason>, from: DateKey, count: number, reason: RestReason): Record<DateKey, RestReason> {
  const next = { ...days }
  for (let i = 0; i < Math.min(30, Math.max(1, count)); i++) next[addDays(from, i)] = reason
  return normRestDays(next)
}

/** Ends a day off: the chosen day and the unbroken run of days off that follows it. */
export function endRest(days: Record<DateKey, RestReason>, from: DateKey): Record<DateKey, RestReason> {
  const next = { ...days }
  for (let d = from; next[d]; d = addDays(d, 1)) delete next[d]
  return next
}

/** How many days into a run of days off this day is, and how long the run is. */
export function restRun(days: Record<DateKey, RestReason>, day: DateKey): { n: number; of: number } | null {
  if (!days[day]) return null
  let start = day
  while (days[addDays(start, -1)]) start = addDays(start, -1)
  let end = day
  while (days[addDays(end, 1)]) end = addDays(end, 1)
  const span = (a: DateKey, b: DateKey) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000) + 1
  return { n: span(start, day), of: span(start, end) }
}
