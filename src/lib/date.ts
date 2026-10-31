import type { DateKey } from '../state/types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = (now = new Date()) => toKey(now)

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

/** Whole calendar days from `a` to `b` (b − a). DST-safe. */
export function daysBetween(a: DateKey, b: DateKey): number {
  const utc = (k: DateKey) => {
    const [y, m, d] = k.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((utc(b) - utc(a)) / 86_400_000)
}

/** The `n` days ending at `end`, oldest first. */
export function lastNDays(end: DateKey, n: number): DateKey[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)))
}

export function greetingFor(date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export const weekdayShort = (key: DateKey) =>
  fromKey(key).toLocaleDateString(undefined, { weekday: 'narrow' })

export const dayOfMonth = (key: DateKey) => fromKey(key).getDate()

export const longDate = (key: DateKey) =>
  fromKey(key).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

export const shortDate = (key: DateKey) =>
  fromKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function relativeDays(from: DateKey, to: DateKey): string {
  const d = daysBetween(from, to)
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d === -1) return 'Yesterday'
  if (d > 0) return `In ${d} days`
  return `${-d} days ago`
}

/** Monday of the week containing `key` (ISO weeks, matching the database check). */
export function startOfWeek(key: DateKey): DateKey {
  const dow = fromKey(key).getDay() // 0 = Sunday
  return addDays(key, -((dow + 6) % 7))
}

/** `YYYY-MM` */
export type MonthKey = string
export const monthOf = (key: DateKey): MonthKey => key.slice(0, 7)

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export const monthLabel = (month: MonthKey) =>
  new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
