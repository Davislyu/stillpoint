import type { DayFacts } from '../game/stats'

export interface Care {
  joy: number
  belly: number
  energy: number
  wit: number
  /** Overall 0 to 1. */
  score: number
  mood: 'happy' | 'ok' | 'sad' | 'sleep'
  label: string
  /** The thing the pet most wants right now. */
  want: 'joy' | 'belly' | 'energy' | 'wit' | null
}

export const STAGES = [
  { from: 1, name: 'Hatchling', size: 56 },
  { from: 3, name: 'Youngling', size: 64 },
  { from: 10, name: 'Companion', size: 72 },
  { from: 25, name: 'Guardian', size: 80 },
] as const
export const stageFor = (level: number) => [...STAGES].reverse().find((s) => level >= s.from)!

/** Accessories earned by level; the highest one is worn. */
export const ACCESSORIES = [
  { from: 3, id: 'bow', label: 'Ribbon' },
  { from: 8, id: 'scarf', label: 'Scarf' },
  { from: 15, id: 'hat', label: 'Wizard hat' },
  { from: 25, id: 'crown', label: 'Crown' },
] as const
export type AccessoryId = (typeof ACCESSORIES)[number]['id']
export const accessoryFor = (level: number): AccessoryId | null => [...ACCESSORIES].reverse().find((a) => level >= a.from)?.id ?? null

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/**
 * How the pet feels today. All of it is derived from what you did, so nothing is stored and
 * a missed day never hurts: the pet just waits. Mornings start gentle (never gloomy before 6pm).
 */
export function careOf(input: {
  facts: DayFacts | undefined
  mealsPerDay: number
  workoutsThisWeek: number
  /** 0 (Monday morning) to 1 (Sunday night). */
  weekFraction: number
  hour: number
  resting: boolean
}): Care {
  const { facts, mealsPerDay, workoutsThisWeek, weekFraction, hour, resting } = input
  const joy = facts?.share == null ? 0.5 : clamp01(facts.share)
  const belly = clamp01((facts?.meals ?? 0) / Math.max(1, mealsPerDay))
  const owed = Math.max(1, Math.round(4 * Math.max(weekFraction, 0.15)))
  const energy = clamp01(workoutsThisWeek / owed)
  const wit = facts ? clamp01(Math.max(facts.noteWords / 50, facts.hasCritical ? 1 : 0)) : 0
  const score = (joy + belly + energy + wit) / 4
  const entries: ['joy' | 'belly' | 'energy' | 'wit', number][] = [['joy', joy], ['belly', belly], ['energy', energy], ['wit', wit]]
  const lowest = entries.sort((a, b) => a[1] - b[1])[0]
  const sleeping = hour >= 23 || hour < 6
  let mood: Care['mood'] = score >= 0.55 ? 'happy' : score >= 0.25 || hour < 18 ? 'ok' : 'sad'
  if (resting) mood = 'ok'
  if (sleeping) mood = 'sleep'
  const label = mood === 'sleep' ? 'Sleeping' : mood === 'happy' ? 'Glowing' : mood === 'ok' ? 'Content' : 'Wistful'
  return { joy, belly, energy, wit, score, mood, label, want: lowest[1] < 0.5 && mood !== 'sleep' && !resting ? lowest[0] : null }
}

export const WANT_LINE: Record<NonNullable<Care['want']>, string[]> = {
  joy: ['Psst. A habit or two would make my day.', 'Can we tick something off together?'],
  belly: ['Is it snack time? Log a meal for me?', 'My tummy is making noises.'],
  energy: ['Let us go move a little this week.', 'I could use a workout. Zoomies?'],
  wit: ['Write me a thought? Even one line.', 'What did you notice today?'],
}
