/**
 * Row shapes exactly as stored in Postgres (snake_case), plus per-table sync
 * metadata. See supabase/migrations for the authoritative schema.
 */
import type { AccentId, DateKey, SpendingCategory } from '../state/types'

export type HabitRow = {
  id: string
  user_id: string
  name: string
  accent: AccentId
  created_on: DateKey
  archived_on: DateKey | null
}
export type CompletionRow = {
  id: string
  user_id: string
  habit_id: string
  date: DateKey
}
export type MilestoneRow = {
  user_id: string
  milestone_key: string
  reached_on: DateKey
}
export type ObservationRow = {
  user_id: string
  date: DateKey
  critical_thinking_text: string
  observations_text: string
}
export type MealRow = {
  user_id: string
  date: DateKey
  meal_number: number
  is_completed: boolean
  notes: string
}
export type WorkoutRow = {
  user_id: string
  week_start_date: DateKey
  workout_count: number
}
export type SpendingRow = {
  id: string
  user_id: string
  date: DateKey
  amount: number
  description: string
  category: SpendingCategory
}

export type NoteRow = {
  id: string
  user_id: string
  date: DateKey
  title: string
  body: string
}
export type PrEntry = { date: DateKey; kg: number; reps: number }
export type ExerciseRow = {
  id: string
  user_id: string
  name: string
  weight_kg: number
  reps: number
  created_on: DateKey
  pr_on: DateKey | null
  history: PrEntry[]
}

export interface RowMap {
  habits: HabitRow
  habit_completions: CompletionRow
  milestones: MilestoneRow
  daily_observations: ObservationRow
  meals: MealRow
  workouts: WorkoutRow
  non_essential_spendings: SpendingRow
  notes: NoteRow
  exercises: ExerciseRow
}
export type TableName = keyof RowMap
/** Any row, possibly partial (patches), as it travels through the sync layer. */
export type AnyRow = Record<string, unknown>

interface TableSpec {
  /** Columns that identify a row. `id` for id tables, else the natural key (minus user_id). */
  key: string[]
  /** Postgres conflict target used for upserts. */
  onConflict: string
  /** Columns fetched from the server. */
  columns: string
}

export const TABLES: Record<TableName, TableSpec> = {
  habits: { key: ['id'], onConflict: 'id', columns: 'id,user_id,name,accent,created_on,archived_on' },
  habit_completions: { key: ['id'], onConflict: 'id', columns: 'id,user_id,habit_id,date' },
  milestones: {
    key: ['milestone_key'],
    onConflict: 'user_id,milestone_key',
    columns: 'user_id,milestone_key,reached_on',
  },
  daily_observations: {
    key: ['date'],
    onConflict: 'user_id,date',
    columns: 'id,user_id,date,critical_thinking_text,observations_text',
  },
  meals: {
    key: ['date', 'meal_number'],
    onConflict: 'user_id,date,meal_number',
    columns: 'id,user_id,date,meal_number,is_completed,notes',
  },
  workouts: {
    key: ['week_start_date'],
    onConflict: 'user_id,week_start_date',
    columns: 'id,user_id,week_start_date,workout_count',
  },
  non_essential_spendings: {
    key: ['id'],
    onConflict: 'id',
    columns: 'id,user_id,date,amount,description,category',
  },
  notes: {
    key: ['id'],
    onConflict: 'id',
    columns: 'id,user_id,date,title,body',
  },
  exercises: {
    key: ['id'],
    onConflict: 'id',
    columns: 'id,user_id,name,weight_kg,reps,created_on,pr_on,history',
  },
}

/** Tables added after launch. If the database hasn't been updated yet, the app runs without them. */
export const OPTIONAL_TABLES: TableName[] = ['notes', 'exercises']

export const TABLE_NAMES = Object.keys(TABLES) as TableName[]

/** Tables whose rows are identified by a natural key rather than `id`. */
export const usesNaturalKey = (t: TableName) => TABLES[t].key[0] !== 'id'

export function rowKey(table: TableName, row: AnyRow): string {
  return TABLES[table].key.map((c) => String(row[c])).join('|')
}

export type TableStore = { [T in TableName]: Record<string, RowMap[T]> }

export const emptyTables = (): TableStore => ({
  habits: {},
  habit_completions: {},
  milestones: {},
  daily_observations: {},
  meals: {},
  workouts: {},
  non_essential_spendings: {},
  notes: {},
  exercises: {},
})

export type Snapshot = { [T in TableName]: RowMap[T][] }
