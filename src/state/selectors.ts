import { addDays, lastNDays, startOfWeek, type MonthKey } from '../lib/date'
import { MEAL_NUMBERS, type AppState, type DateKey, type Habit } from './types'

/** A day counts toward the streak once at least this share of habits is done. */
export const STREAK_THRESHOLD = 0.5
export const WINDOW_DAYS = 14

// ── Habits ──────────────────────────────────────────────────────────────

export const isActiveOn = (h: Habit, day: DateKey) =>
  h.createdOn <= day && (!h.archivedOn || h.archivedOn > day)

export const activeHabits = (s: AppState, day: DateKey) => s.habits.filter((h) => isActiveOn(h, day))

export const isDone = (s: AppState, id: string, day: DateKey) => (s.completions[day] ?? []).includes(id)

export interface DayCompletion {
  date: DateKey
  done: number
  total: number
  /** 0–1, or null when no habits were being tracked that day */
  share: number | null
}

export function completionOn(s: AppState, day: DateKey): DayCompletion {
  const habits = activeHabits(s, day)
  const doneIds = new Set(s.completions[day] ?? [])
  const done = habits.filter((h) => doneIds.has(h.id)).length
  return { date: day, done, total: habits.length, share: habits.length ? done / habits.length : null }
}

export const completionHistory = (s: AppState, today: DateKey, n = WINDOW_DAYS) =>
  lastNDays(today, n).map((d) => completionOn(s, d))

const qualifies = (c: DayCompletion) => c.share !== null && c.share >= STREAK_THRESHOLD

/**
 * Consecutive days at ≥ 50 % completion, ending today. Today is still in
 * progress, so if it hasn't qualified yet the streak runs through yesterday.
 */
export function currentStreak(s: AppState, today: DateKey): number {
  let day = qualifies(completionOn(s, today)) ? today : addDays(today, -1)
  let streak = 0
  // 3650-day guard keeps a corrupted save from looping forever.
  for (let i = 0; i < 3650; i++) {
    if (!qualifies(completionOn(s, day))) break
    streak++
    day = addDays(day, -1)
  }
  return streak
}

export const SHIELD_EVERY = 7
export const MAX_SHIELDS = 2

export interface StreakInfo {
  streak: number
  /** Shields banked right now (earned every 7th streak day, at most 2). */
  shields: number
  /** Days a shield quietly saved the streak. */
  savedDays: DateKey[]
  /** The most recent time a streak ended, and how long it was. */
  lastBreak: { date: DateKey; lost: number } | null
}

/**
 * The streak you see: like currentStreak, but a missed day spends a banked
 * shield instead of resetting to zero. Derived from history, nothing stored.
 */
export function streakInfo(s: AppState, today: DateKey): StreakInfo {
  const info: StreakInfo = { streak: 0, shields: 0, savedDays: [], lastBreak: null }
  const first = s.habits.reduce<DateKey | null>((a, h) => (a === null || h.createdOn < a ? h.createdOn : a), null)
  if (!first || first > today) return info
  let day = first
  for (let i = 0; i < 3650 && day <= today; i++, day = addDays(day, 1)) {
    const c = completionOn(s, day)
    if (qualifies(c)) {
      info.streak++
      if (info.streak % SHIELD_EVERY === 0 && info.shields < MAX_SHIELDS) info.shields++
    } else if (day === today || c.share === null) {
      // today is still in progress, and days with nothing tracked are neutral
    } else if (info.streak > 0) {
      if (info.shields > 0) {
        info.shields--
        info.savedDays.push(day)
      } else {
        info.lastBreak = { date: day, lost: info.streak }
        info.streak = 0
      }
    }
  }
  return info
}

// ── Meals ───────────────────────────────────────────────────────────────

/** The meal slots in use, per the person's own target. */
export const mealSlots = (s: Pick<AppState, 'mealsPerDay'>) => MEAL_NUMBERS.filter((n) => n <= s.mealsPerDay)

export const mealsDone = (s: AppState, day: DateKey) =>
  mealSlots(s).filter((n) => s.meals[day]?.[n]?.isCompleted).length

// ── Workouts ────────────────────────────────────────────────────────────

export const workoutsInWeek = (s: AppState, weekStart: DateKey) => s.workouts[weekStart] ?? 0

/** The last `n` weeks (Monday keys), oldest first, ending with the current one. */
export const recentWeeks = (today: DateKey, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(startOfWeek(today), -7 * (n - 1 - i)))

// ── Spending ────────────────────────────────────────────────────────────

export const spendingsInMonth = (s: AppState, month: MonthKey) => s.spendings.filter((x) => x.date.startsWith(month))

export const monthTotalCents = (s: AppState, month: MonthKey) =>
  spendingsInMonth(s, month).reduce((sum, x) => sum + x.amountCents, 0)
