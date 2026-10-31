import { addDays, startOfWeek } from '../lib/date'
import { completionOn } from '../state/selectors'
import type { AppState, DateKey } from '../state/types'

export interface WeekSummary {
  start: DateKey
  end: DateKey
  days: DateKey[]
  /** Days at half or more of habits done. */
  habitDays: number
  perfectDays: number
  ticks: number
  meals: number
  noteDays: number
  workouts: number
  /** Past days with no extra spending (today counts once it is over). */
  noSpendDays: number
  extrasCents: number
  extrasCount: number
  kills: { minion: number; elite: number; boss: number }
  bestDay: { date: DateKey; ticks: number } | null
}

export function summarizeWeek(s: AppState, today: DateKey): WeekSummary {
  const start = startOfWeek(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const out: WeekSummary = {
    start, end: days[6], days, habitDays: 0, perfectDays: 0, ticks: 0, meals: 0, noteDays: 0,
    workouts: s.workouts[start] ?? 0, noSpendDays: 0, extrasCents: 0, extrasCount: 0,
    kills: { minion: 0, elite: 0, boss: 0 }, bestDay: null,
  }
  const first = s.habits.reduce<DateKey | null>((a, h) => (a === null || h.createdOn < a ? h.createdOn : a), null)
  const spendDays = new Map<DateKey, number>()
  for (const x of s.spendings) {
    if (x.date < start || x.date > days[6]) continue
    spendDays.set(x.date, (spendDays.get(x.date) ?? 0) + 1)
    out.extrasCents += x.amountCents
    out.extrasCount++
  }
  for (const d of days) {
    if (d > today) break
    const c = completionOn(s, d)
    if (c.share !== null && c.share >= 0.5) out.habitDays++
    if (c.share === 1) out.perfectDays++
    out.ticks += c.done
    if (!out.bestDay || c.done > out.bestDay.ticks) out.bestDay = c.done > 0 ? { date: d, ticks: c.done } : out.bestDay
    out.meals += [1, 2, 3, 4, 5].filter((n) => s.meals[d]?.[n as 1]?.isCompleted).length
    const o = s.observations[d]
    if (o && (o.criticalThinking.trim() || o.observations.trim())) out.noteDays++
    if (d < today && first && d >= first && !spendDays.has(d)) out.noSpendDays++
  }
  for (const key of Object.keys(s.milestones)) {
    const m = /^kill-(\d{4}-\d{2}-\d{2})-(\d)$/.exec(key)
    if (m && m[1] >= start && m[1] <= days[6]) out.kills[m[2] === '2' ? 'elite' : 'minion']++
    const b = /^boss-(\d{4}-\d{2}-\d{2})$/.exec(key)
    if (b && b[1] >= start && b[1] <= days[6]) out.kills.boss++
  }
  return out
}

export function shareText(w: WeekSummary, fmtMoney: (cents: number) => string, name?: string | null): string {
  const slain = w.kills.minion + w.kills.elite + w.kills.boss
  const lines = [
    `${name ? `${name}'s ` : 'My '}Stillpoint chronicle, week of ${w.start}`,
    `Habits: ${w.ticks} ticks, ${w.habitDays} strong days${w.perfectDays ? `, ${w.perfectDays} perfect` : ''}`,
    `Workouts: ${w.workouts}`,
    `Monsters slain: ${slain}${w.kills.boss ? ' (the weekly boss fell)' : ''}`,
    `Extras: ${fmtMoney(w.extrasCents)}, ${w.noSpendDays} no-spend ${w.noSpendDays === 1 ? 'day' : 'days'}`,
  ]
  return lines.join('\n')
}
