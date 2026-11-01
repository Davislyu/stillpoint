/** Local calendar day, formatted `YYYY-MM-DD`. */
export type DateKey = string

export type AccentId = 'sage' | 'dusk' | 'mauve' | 'sand' | 'teal' | 'clay'

export interface Habit {
  id: string
  name: string
  accent: AccentId
  /** First day this habit counts toward completion share. */
  createdOn: DateKey
  /** From this day on the habit no longer counts. History before it is kept. */
  archivedOn?: DateKey
}

export interface Observation {
  criticalThinking: string
  observations: string
}

export interface Meal {
  isCompleted: boolean
  notes: string
}

export const MEAL_NUMBERS = [1, 2, 3, 4, 5] as const
export type MealNumber = (typeof MEAL_NUMBERS)[number]

export const WORKOUTS_PER_WEEK = 4

export type SpendingCategory = 'coffee' | 'subscription' | 'impulse' | 'eating-out' | 'entertainment' | 'other' | 'groceries' | 'bills' | 'transport' | 'health' | 'shopping'

/** Why a day is skipped. Days off never break a streak or count against progress. */
export type RestReason = 'sick' | 'holiday' | 'travel' | 'rest' | 'other'

export interface Spending {
  id: string
  date: DateKey
  /** Integer cents, to keep totals exact. */
  amountCents: number
  description: string
  category: SpendingCategory
  /** Unavoidable (arnona, rent): tracked, but never counted against progress. */
  justified: boolean
}

export interface Note {
  id: string
  /** Day it was written. */
  date: DateKey
  title: string
  body: string
}

export interface PrEntry {
  date: DateKey
  kg: number
  reps: number
}

export interface Exercise {
  id: string
  name: string
  /** Current best, in kilograms. */
  kg: number
  reps: number
  createdOn: DateKey
  prOn: DateKey | null
  /** Every PR, oldest first. */
  history: PrEntry[]
}

/** The read model every component renders from. Derived from synced rows. */
export interface AppState {
  habits: Habit[]
  /** day → ids of habits completed that day */
  completions: Record<DateKey, string[]>
  /** milestone id → day it was first reached */
  milestones: Record<string, DateKey>
  observations: Record<DateKey, Observation>
  /** day → meal number → meal */
  meals: Record<DateKey, Partial<Record<MealNumber, Meal>>>
  /** Monday of the week → workouts logged */
  workouts: Record<DateKey, number>
  spendings: Spending[]
  /** How many meals the person plans to eat a day (1 to 5). Comes from preferences, not from synced rows. */
  mealsPerDay: number
  /** Days the person skipped on purpose. Also from preferences. */
  restDays: Record<DateKey, RestReason>
  notes: Note[]
  exercises: Exercise[]
}
