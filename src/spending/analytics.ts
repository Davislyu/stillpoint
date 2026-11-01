import { addDays, addMonths, monthOf, type MonthKey } from '../lib/date'
import type { DateKey, Spending, SpendingCategory } from '../state/types'

export interface Split {
  /** Cents that count against progress. */
  counted: number
  /** Cents marked justified (rent, taxes, groceries and the like). */
  justified: number
}
const total = (s: Split) => s.counted + s.justified
export const totalOf = total
const add = (s: Split, x: Spending) => void (x.justified ? (s.justified += x.amountCents) : (s.counted += x.amountCents))

export const daysInMonth = (m: MonthKey) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate()

export interface DayBar extends Split {
  day: number
  date: DateKey
}
export interface CategoryBar extends Split {
  id: SpendingCategory
}

export interface MonthReport extends Split {
  month: MonthKey
  count: number
  days: DayBar[]
  categories: CategoryBar[]
  biggest: Spending | null
  /** Average per day so far (to today for the current month, whole month otherwise). */
  perDay: number
  /** Running total by day of month. */
  cumulative: number[]
}

export function monthReport(all: Spending[], month: MonthKey, today: DateKey): MonthReport {
  const n = daysInMonth(month)
  const days: DayBar[] = Array.from({ length: n }, (_, i) => ({ day: i + 1, date: `${month}-${String(i + 1).padStart(2, '0')}`, counted: 0, justified: 0 }))
  const cats = new Map<SpendingCategory, CategoryBar>()
  const sum: Split = { counted: 0, justified: 0 }
  let biggest: Spending | null = null
  let count = 0
  for (const x of all) {
    if (monthOf(x.date) !== month) continue
    count++
    add(sum, x)
    add(days[Number(x.date.slice(8, 10)) - 1], x)
    const c = cats.get(x.category) ?? { id: x.category, counted: 0, justified: 0 }
    add(c, x)
    cats.set(x.category, c)
    if (!biggest || x.amountCents > biggest.amountCents) biggest = x
  }
  const elapsed = monthOf(today) === month ? Number(today.slice(8, 10)) : month < monthOf(today) ? n : 0
  let run = 0
  return {
    month,
    ...sum,
    count,
    days,
    categories: [...cats.values()].sort((a, b) => total(b) - total(a)),
    biggest,
    perDay: elapsed ? Math.round(total(sum) / elapsed) : 0,
    cumulative: days.map((d) => (run += total(d))),
  }
}

export function trend(all: Spending[], endMonth: MonthKey, months = 6): (Split & { month: MonthKey })[] {
  return Array.from({ length: months }, (_, i) => {
    const month = addMonths(endMonth, i - (months - 1))
    const s: Split = { counted: 0, justified: 0 }
    for (const x of all) if (monthOf(x.date) === month) add(s, x)
    return { month, ...s }
  })
}

/** Average spend on each weekday (Monday first) across the last `weeks` full weeks to today. */
export function weekdayAverages(all: Spending[], today: DateKey, weeks = 12): number[] {
  const from = addDays(today, -weeks * 7 + 1)
  const sums = Array(7).fill(0)
  for (const x of all) {
    if (x.date < from || x.date > today) continue
    const dow = (new Date(`${x.date}T12:00:00`).getDay() + 6) % 7
    sums[dow] += x.amountCents
  }
  return sums.map((v) => Math.round(v / weeks))
}

export const share = (part: number, whole: number) => (whole > 0 ? part / whole : 0)
