/**
 * User intents → row operations. This is the old reducer's logic, unchanged
 * in behaviour, now expressed as ops the sync engine can apply locally and
 * replay against the server.
 */
import { rowKey, type TableName, type TableStore } from '../data/schema'
import type { Op } from '../data/ops'
import { stableUid, uid } from '../lib/id'
import type { AccentId, DateKey, MealNumber, SpendingCategory } from './types'

export type Action =
  | { type: 'habit/add'; name: string; accent: AccentId; today: DateKey }
  | { type: 'habit/rename'; id: string; name: string }
  | { type: 'habit/recolor'; id: string; accent: AccentId }
  | { type: 'habit/remove'; id: string; today: DateKey }
  | { type: 'habit/toggle'; id: string; date: DateKey }
  | { type: 'milestones/unlock'; ids: string[]; today: DateKey }
  | { type: 'observation/set'; date: DateKey; field: 'criticalThinking' | 'observations'; text: string }
  | { type: 'meal/toggle'; date: DateKey; meal: MealNumber }
  | { type: 'meal/note'; date: DateKey; meal: MealNumber; notes: string }
  | { type: 'workout/set'; weekStart: DateKey; count: number }
  | { type: 'spending/add'; date: DateKey; amountCents: number; description: string; category: SpendingCategory }
  | { type: 'spending/remove'; id: string }

const upsert = (table: TableName, row: Record<string, unknown>): Op => ({
  opId: uid(),
  table,
  kind: 'upsert',
  key: rowKey(table, row),
  row,
})
const update = (table: TableName, id: string, patch: Record<string, unknown>): Op => ({
  opId: uid(),
  table,
  kind: 'update',
  key: id,
  id,
  patch,
})
const del = (table: TableName, id: string): Op => ({ opId: uid(), table, kind: 'delete', key: id, id })

export function actionToOps(action: Action, t: TableStore, userId: string): Op[] {
  switch (action.type) {
    case 'habit/add': {
      const name = action.name.trim()
      if (!name) return []
      return [
        upsert('habits', {
          id: uid(),
          user_id: userId,
          name,
          accent: action.accent,
          created_on: action.today,
          archived_on: null,
        }),
      ]
    }
    case 'habit/rename': {
      const name = action.name.trim()
      return name && t.habits[action.id] ? [update('habits', action.id, { name })] : []
    }
    case 'habit/recolor':
      return t.habits[action.id] ? [update('habits', action.id, { accent: action.accent })] : []
    case 'habit/remove': {
      const habit = t.habits[action.id]
      if (!habit) return []
      // A habit added today has no history worth keeping: drop it entirely.
      if (habit.created_on >= action.today) return [del('habits', action.id)]
      // Otherwise archive from today so past percentages stay true.
      return [update('habits', action.id, { archived_on: action.today })]
    }
    case 'habit/toggle': {
      const habit = t.habits[action.id]
      if (!habit) return []
      const existing = Object.values(t.habit_completions).find(
        (c) => c.habit_id === action.id && c.date === action.date,
      )
      if (existing) return [del('habit_completions', existing.id)]
      const ops: Op[] = []
      // Ticking a day before the habit existed back-fills its start date.
      if (action.date < habit.created_on) ops.push(update('habits', action.id, { created_on: action.date }))
      ops.push(upsert('habit_completions', { id: uid(), user_id: userId, habit_id: action.id, date: action.date }))
      return ops
    }
    case 'milestones/unlock': {
      const rows = action.ids
        .filter((id) => !t.milestones[id])
        .map((id) => ({ user_id: userId, milestone_key: id, reached_on: action.today }))
      if (rows.length === 0) return []
      if (rows.length === 1) return [upsert('milestones', rows[0])]
      return [{ opId: uid(), table: 'milestones', kind: 'bulkUpsert', key: `bulk:${uid()}`, rows }]
    }

    case 'observation/set':
      return [
        upsert('daily_observations', {
          user_id: userId,
          date: action.date,
          [action.field === 'criticalThinking' ? 'critical_thinking_text' : 'observations_text']: action.text,
        }),
      ]
    case 'meal/toggle': {
      const current = t.meals[rowKey('meals', { date: action.date, meal_number: action.meal })]
      return [
        upsert('meals', {
          user_id: userId,
          date: action.date,
          meal_number: action.meal,
          is_completed: !current?.is_completed,
        }),
      ]
    }
    case 'meal/note':
      return [upsert('meals', { user_id: userId, date: action.date, meal_number: action.meal, notes: action.notes })]
    case 'workout/set':
      return [
        upsert('workouts', {
          user_id: userId,
          week_start_date: action.weekStart,
          workout_count: Math.max(0, Math.min(4, Math.round(action.count))),
        }),
      ]
    case 'spending/add': {
      const description = action.description.trim()
      if (!description || !(action.amountCents > 0)) return []
      return [
        upsert('non_essential_spendings', {
          id: uid(),
          user_id: userId,
          date: action.date,
          amount: action.amountCents / 100,
          description,
          category: action.category,
        }),
      ]
    }
    case 'spending/remove':
      return t.non_essential_spendings[action.id] ? [del('non_essential_spendings', action.id)] : []
  }
}

const DEFAULT_HABITS: [string, AccentId][] = [
  ['Gym', 'clay'],
  ['Stretch', 'sage'],
  ['Drink 3L water', 'teal'],
  ['Cardio', 'dusk'],
]

/** Starter habits for a brand-new account, with ids stable across devices. */
export async function defaultHabitOps(userId: string, today: DateKey, habits: [string, AccentId][] = DEFAULT_HABITS): Promise<Op[]> {
  return Promise.all(
    habits.map(async ([name, accent]) =>
      upsert('habits', {
        id: await stableUid(`${userId}:default-habit:${name}`),
        user_id: userId,
        name,
        accent,
        created_on: today,
        archived_on: null,
      }),
    ),
  )
}
