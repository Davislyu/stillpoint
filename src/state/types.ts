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

export type SpendingCategory = 'coffee' | 'subscription' | 'impulse' | 'eating-out' | 'entertainment' | 'other'

export interface Spending {
  id: string
  date: DateKey
  /** Integer cents, to keep totals exact. */
  amountCents: number
  description: string
  category: SpendingCategory
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
}
