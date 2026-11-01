/**
 * Everything the game layer knows about you, derived from your synced data in
 * one pass. Nothing here is stored: XP, levels and quest results are always
 * recomputed, so they can never drift from what you actually did.
 */
import { addDays, addMonths, daysBetween, fromKey, monthOf, startOfWeek, toKey } from '../lib/date'
import { completionOn } from '../state/selectors'
import { mealSlots } from '../state/selectors'
import { type AppState, type DateKey } from '../state/types'

export const words = (s: string | undefined) => (s ? s.trim().split(/\s+/).filter(Boolean).length : 0)

export interface DayFacts {
  date: DateKey
  habitsDone: number
  habitsTotal: number
  share: number | null
  meals: number
  mealNotes: number
  noteWords: number
  /** Every planned meal eaten. */
  fullMeals: boolean
  /** Meals planned that day (the person's own target). */
  mealTarget: number
  hasNote: boolean
  hasCritical: boolean
  hasObservation: boolean
  spendCount: number
  active: boolean
}

export function dayFacts(s: AppState, date: DateKey, spendByDay: Map<DateKey, number>): DayFacts {
  const c = completionOn(s, date)
  const meals = s.meals[date] ?? {}
  const o = s.observations[date]
  const ct = o?.criticalThinking.trim() ?? ''
  const ob = o?.observations.trim() ?? ''
  const slots = mealSlots(s)
  const mealsDone = slots.filter((n) => meals[n]?.isCompleted).length
  const spendCount = spendByDay.get(date) ?? 0
  return {
    date,
    habitsDone: c.done,
    habitsTotal: c.total,
    share: c.share,
    meals: mealsDone,
    fullMeals: mealsDone === slots.length,
    mealTarget: slots.length,
    mealNotes: slots.filter((n) => meals[n]?.notes?.trim()).length,
    noteWords: words(ct) + words(ob),
    hasNote: !!(ct || ob),
    hasCritical: !!ct,
    hasObservation: !!ob,
    spendCount,
    active: c.done > 0 || mealsDone > 0 || !!(ct || ob) || spendCount > 0,
  }
}

export interface PlayerStats {
  firstDay: DateKey | null
  // habits
  habitTicks: number
  perfectDays: number
  currentStreak: number
  bestStreak: number
  bestPerfectStreak: number
  maxHabitsInDay: number
  habitsCreated: number
  perfectWeeks: number
  perfectMonths: number
  // meals
  mealsLogged: number
  fullMealDays: number
  bestFullMealStreak: number
  mealNotes: number
  mealSlot: Record<number, number>
  // workouts
  workoutsTotal: number
  fullWeeks: number
  bestFullWeekStreak: number
  bestWorkoutMonth: number
  // mind
  noteDays: number
  bestNoteStreak: number
  criticalEntries: number
  wordsTotal: number
  longestEntryWords: number
  bothNotesDays: number
  // money
  spendLogged: number
  categoryCounts: Record<string, number>
  monthsImproved: number
  noSpendDays: number
  /** Lowest total (cents) of a completed month since tracking began; null if none yet. */
  bestMonthLeak: number | null
  // overall
  activeDays: number
  currentActiveStreak: number
  bestActiveStreak: number
  comebacks: number
  fullPartyDays: number
  weekendPerfects: number
  /** "MM-DD" of every day with activity, for seasonal achievements. */
  activeMonthDays: Set<string>
  days: DayFacts[]
}

export function computeStats(s: AppState, today: DateKey): PlayerStats {
  const spendByDay = new Map<DateKey, number>()
  const spendByMonth = new Map<string, number>()
  const categoryCounts: Record<string, number> = {}
  for (const x of s.spendings) {
    if (x.justified) continue // unavoidable payments never count against progress
    spendByDay.set(x.date, (spendByDay.get(x.date) ?? 0) + 1)
    spendByMonth.set(monthOf(x.date), (spendByMonth.get(monthOf(x.date)) ?? 0) + x.amountCents)
    categoryCounts[x.category] = (categoryCounts[x.category] ?? 0) + 1
  }

  // The earliest day with any data at all.
  const candidates = [
    ...Object.keys(s.completions),
    ...Object.keys(s.meals),
    ...Object.keys(s.observations),
    ...s.spendings.filter((x) => !x.justified).map((x) => x.date),
    ...s.habits.map((h) => h.createdOn),
  ].filter((d) => d <= today)
  const firstDay = candidates.length ? candidates.reduce((a, b) => (a < b ? a : b)) : null

  const st: PlayerStats = {
    firstDay,
    habitTicks: 0, perfectDays: 0, currentStreak: 0, bestStreak: 0, bestPerfectStreak: 0, maxHabitsInDay: 0,
    habitsCreated: s.habits.length, perfectWeeks: 0, perfectMonths: 0,
    mealsLogged: 0, fullMealDays: 0, bestFullMealStreak: 0, mealNotes: 0, mealSlot: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    workoutsTotal: 0, fullWeeks: 0, bestFullWeekStreak: 0, bestWorkoutMonth: 0,
    noteDays: 0, bestNoteStreak: 0, criticalEntries: 0, wordsTotal: 0, longestEntryWords: 0, bothNotesDays: 0,
    spendLogged: s.spendings.filter((x) => !x.justified).length, categoryCounts, monthsImproved: 0, noSpendDays: 0, bestMonthLeak: null,
    activeDays: 0, currentActiveStreak: 0, bestActiveStreak: 0, comebacks: 0, fullPartyDays: 0, weekendPerfects: 0,
    activeMonthDays: new Set(), days: [],
  }
  if (!firstDay) return st

  const counted = s.spendings.filter((x) => !x.justified)
  const firstSpend = counted.length ? counted.reduce((a, b) => (a.date < b.date ? a : b)).date : null
  let streak = 0, perfectRun = 0, mealRun = 0, noteRun = 0, activeRun = 0, gap = 0, seenActive = false
  const span = Math.min(daysBetween(firstDay, today), 3650)

  for (let i = 0; i <= span; i++) {
    const date = addDays(firstDay, i)
    const f = dayFacts(s, date, spendByDay)
    st.days.push(f)
    const isToday = date === today

    st.habitTicks += f.habitsDone
    st.maxHabitsInDay = Math.max(st.maxHabitsInDay, f.habitsDone)
    const half = f.share !== null && f.share >= 0.5
    const perfect = f.share === 1
    if (perfect) st.perfectDays++
    // Today still in progress: don't break a run just because it isn't done yet.
    streak = half ? streak + 1 : isToday ? streak : 0
    perfectRun = perfect ? perfectRun + 1 : isToday ? perfectRun : 0
    st.bestStreak = Math.max(st.bestStreak, streak)
    st.bestPerfectStreak = Math.max(st.bestPerfectStreak, perfectRun)

    st.mealsLogged += f.meals
    st.mealNotes += f.mealNotes
    for (const n of mealSlots(s)) if (s.meals[date]?.[n]?.isCompleted) st.mealSlot[n]++
    if (f.fullMeals) st.fullMealDays++
    mealRun = f.fullMeals ? mealRun + 1 : isToday ? mealRun : 0
    st.bestFullMealStreak = Math.max(st.bestFullMealStreak, mealRun)

    if (f.hasNote) st.noteDays++
    if (f.hasCritical) st.criticalEntries++
    if (f.hasCritical && f.hasObservation) st.bothNotesDays++
    st.wordsTotal += f.noteWords
    const o = s.observations[date]
    if (o) st.longestEntryWords = Math.max(st.longestEntryWords, words(o.criticalThinking), words(o.observations))
    noteRun = f.hasNote ? noteRun + 1 : isToday ? noteRun : 0
    st.bestNoteStreak = Math.max(st.bestNoteStreak, noteRun)

    if (firstSpend && date >= firstSpend && f.spendCount === 0 && !isToday) st.noSpendDays++
    if (half && f.fullMeals && f.hasNote && f.spendCount === 0) st.fullPartyDays++

    if (f.active) {
      if (seenActive && gap >= 3) st.comebacks++
      seenActive = true
      gap = 0
      st.activeDays++
      st.activeMonthDays.add(date.slice(5))
      activeRun++
    } else {
      gap++
      if (!isToday) activeRun = 0
    }
    st.bestActiveStreak = Math.max(st.bestActiveStreak, activeRun)

    // Weekend: Sunday closes a Saturday + Sunday pair.
    if (fromKey(date).getDay() === 0 && perfect && i > 0 && st.days[i - 1].share === 1) st.weekendPerfects++
  }
  st.currentStreak = streak
  st.currentActiveStreak = activeRun

  // Weeks (Monday-based) where all 7 days were at half or more.
  const byDate = new Map(st.days.map((d) => [d.date, d]))
  for (let w = startOfWeek(firstDay); w <= addDays(today, -6); w = addDays(w, 7)) {
    let ok = true
    for (let k = 0; k < 7; k++) {
      const d = byDate.get(addDays(w, k))
      if (!d || d.share === null || d.share < 0.5) ok = false
    }
    if (ok) st.perfectWeeks++
  }

  // Completed months where every tracked day was at half or more (20+ tracked days).
  for (let m = monthOf(firstDay); m < monthOf(today); m = addMonths(m, 1)) {
    const days = st.days.filter((d) => d.date.startsWith(m) && d.share !== null)
    if (days.length >= 20 && days.every((d) => (d.share ?? 0) >= 0.5)) st.perfectMonths++
  }

  // Workouts.
  const weeks = Object.keys(s.workouts).sort()
  const byMonth: Record<string, number> = {}
  let fullRun = 0, prev: string | null = null
  for (const w of weeks) {
    const n = s.workouts[w] ?? 0
    st.workoutsTotal += n
    byMonth[monthOf(w)] = (byMonth[monthOf(w)] ?? 0) + n
    if (n >= 4) {
      st.fullWeeks++
      fullRun = prev && addDays(prev, 7) === w && fullRun > 0 ? fullRun + 1 : 1
    } else fullRun = 0
    st.bestFullWeekStreak = Math.max(st.bestFullWeekStreak, fullRun)
    prev = w
  }
  st.bestWorkoutMonth = Math.max(0, ...Object.values(byMonth))

  // Money: completed months since tracking started.
  if (firstSpend) {
    for (let m = monthOf(firstSpend); m < monthOf(today); m = addMonths(m, 1)) {
      const total = spendByMonth.get(m) ?? 0
      st.bestMonthLeak = st.bestMonthLeak === null ? total : Math.min(st.bestMonthLeak, total)
      const prevTotal = spendByMonth.get(addMonths(m, -1))
      if (prevTotal !== undefined && prevTotal > 0 && total < prevTotal) st.monthsImproved++
    }
  }
  return st
}

/** Small deterministic hash, for picking each day's quests. */
export function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

export const todayKeyOf = (d: Date) => toKey(d)
