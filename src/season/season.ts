import { addDays } from '../lib/date'
import type { DayFacts } from '../game/stats'
import type { DateKey } from '../state/types'

export type SeasonId = 'winter' | 'spring' | 'summer' | 'autumn'
export interface Season {
  id: SeasonId
  name: string
  /** Season key like autumn-2026. Winter belongs to the year it starts in. */
  key: string
  start: DateKey
  end: DateKey
  title: string
  blurb: string
  charm: string
}

const INFO: Record<SeasonId, { name: string; title: string; blurb: string; charm: string; months: [number, number] }> = {
  autumn: { name: 'Autumn', title: 'Leaf Keeper', blurb: 'Gather the days like fallen leaves.', charm: '#ff9d52', months: [9, 11] },
  winter: { name: 'Winter', title: 'Frost Walker', blurb: 'Keep a small fire going through the long nights.', charm: '#bfe9ff', months: [12, 2] },
  spring: { name: 'Spring', title: 'Bud Tender', blurb: 'Small things are about to grow.', charm: '#ff9ecb', months: [3, 5] },
  summer: { name: 'Summer', title: 'Sun Chaser', blurb: 'Long light, long days, long streaks.', charm: '#ffd24d', months: [6, 8] },
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Meteorological seasons: Dec-Feb winter, Mar-May spring, Jun-Aug summer, Sep-Nov autumn. */
export function seasonOf(date: DateKey): Season {
  const y = Number(date.slice(0, 4))
  const m = Number(date.slice(5, 7))
  const id: SeasonId = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'
  const info = INFO[id]
  const startYear = id === 'winter' && m <= 2 ? y - 1 : y
  const startMonth = info.months[0]
  const endMonth = info.months[1]
  const endYear = id === 'winter' ? startYear + 1 : startYear
  const start = `${startYear}-${pad(startMonth)}-01`
  const nextFirst = endMonth === 12 ? `${endYear + 1}-01-01` : `${endYear}-${pad(endMonth + 1)}-01`
  return { id, name: info.name, key: `${id}-${startYear}`, start, end: addDays(nextFirst, -1), title: info.title, blurb: info.blurb, charm: info.charm }
}

export interface Track {
  id: string
  label: string
  unit: string
  goal: number
  value: number
}

export interface SeasonInput {
  days: DayFacts[]
  /** Workouts per week start. */
  workouts: Record<string, number>
  /** Days a monster fell, one entry per kill. */
  killDays: DateKey[]
  today: DateKey
}

/** Seven tracks, each worth a star. All derived from history, so nothing is stored. */
export function tracksFor(season: Season, input: SeasonInput): Track[] {
  const inside = (d: DateKey) => d >= season.start && d <= season.end
  const days = input.days.filter((d) => inside(d.date))
  const count = (f: (d: DayFacts) => boolean) => days.filter(f).length
  const workouts = Object.entries(input.workouts).reduce((n, [ws, c]) => (inside(ws) ? n + c : n), 0)
  return [
    { id: 'perfect', label: 'Perfect habit days', unit: 'days', goal: 15, value: count((d) => d.share === 1) },
    { id: 'steady', label: 'Days at half or better', unit: 'days', goal: 45, value: count((d) => d.share !== null && d.share >= 0.5) },
    { id: 'meals', label: 'Every planned meal', unit: 'days', goal: 30, value: count((d) => d.fullMeals && d.meals > 0) },
    { id: 'train', label: 'Workouts', unit: 'sessions', goal: 30, value: workouts },
    { id: 'notes', label: 'Days you wrote something', unit: 'days', goal: 30, value: count((d) => d.hasNote) },
    { id: 'purse', label: 'No-spend days', unit: 'days', goal: 30, value: count((d) => d.date < input.today && d.active && d.spendCount === 0) },
    { id: 'hunt', label: 'Monsters slain', unit: 'kills', goal: 90, value: input.killDays.filter(inside).length },
  ]
}

export const starsOf = (tracks: Track[]) => tracks.filter((t) => t.value >= t.goal).length

/** What the stars unlock. */
export const REWARDS = [
  { stars: 1, label: 'Season badge', blurb: 'A keepsake for your shelf.' },
  { stars: 3, label: 'Seasonal charm', blurb: 'Your pet wears the season’s colours.' },
  { stars: 5, label: 'Season title', blurb: 'A title to carry into the next season.' },
  { stars: 7, label: 'Golden keepsake', blurb: 'Everything done. Rare.' },
] as const
