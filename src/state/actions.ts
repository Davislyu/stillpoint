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
  | { type: 'spending/add'; date: DateKey; amountCents: number; description: string; category: SpendingCategory; justified?: boolean }
  | { type: 'spending/justify'; id: string; justified: boolean }
  | { type: 'spending/remove'; id: string }
  | { type: 'note/create'; id: string; date: DateKey; title: string; body: string }
  | { type: 'note/edit'; id: string; title?: string; body?: string }
  | { type: 'note/remove'; id: string }
  | { type: 'exercise/add'; id: string; name: string; kg: number; reps: number; today: DateKey }
  | { type: 'exercise/pr'; id: string; kg: number; reps: number; today: DateKey }
  | { type: 'exercise/correct'; id: string; kg: number }
  | { type: 'exercise/rename'; id: string; name: string }
  | { type: 'exercise/remove'; id: string }

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

const clampKg = (n: number) => Math.min(999.99, Math.max(0, Math.round((Number(n) || 0) * 100) / 100))
const clampReps = (n: number) => Math.min(100, Math.max(1, Math.round(Number(n) || 1)))

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
          // Only sent when set, so ordinary entries keep working.
          ...(action.justified ? { justified: true } : {}),
        }),
      ]
    }
    case 'spending/justify':
      return t.non_essential_spendings[action.id] ? [update('non_essential_spendings', action.id, { justified: action.justified })] : []
    case 'note/create':
      return [upsert('notes', { id: action.id, user_id: userId, date: action.date, title: action.title.slice(0, 120), body: action.body.slice(0, 20000) })]
    case 'note/edit': {
      if (!t.notes[action.id] && !action.id) return []
      const patch: Record<string, unknown> = {}
      if (action.title !== undefined) patch.title = action.title.slice(0, 120)
      if (action.body !== undefined) patch.body = action.body.slice(0, 20000)
      return Object.keys(patch).length ? [update('notes', action.id, patch)] : []
    }
    case 'note/remove':
      return [del('notes', action.id)]
    case 'exercise/add': {
      const name = action.name.trim().slice(0, 60)
      if (!name) return []
      const kg = clampKg(action.kg)
      return [
        upsert('exercises', {
          id: action.id,
          user_id: userId,
          name,
          weight_kg: kg,
          reps: clampReps(action.reps),
          created_on: action.today,
          pr_on: kg > 0 ? action.today : null,
          history: kg > 0 ? [{ date: action.today, kg, reps: clampReps(action.reps) }] : [],
        }),
      ]
    }
    case 'exercise/pr': {
      const ex = t.exercises[action.id]
      if (!ex) return []
      const kg = clampKg(action.kg)
      const reps = clampReps(action.reps)
      // One entry per day: a second PR the same day replaces the first.
      const history = [...(ex.history ?? []).filter((h) => h.date !== action.today), { date: action.today, kg, reps }].slice(-120)
      return [update('exercises', action.id, { weight_kg: kg, reps, pr_on: action.today, history })]
    }
    case 'exercise/correct': {
      // Fixing a typo: changes the current weight and today's entry, not a new PR.
      const ex = t.exercises[action.id]
      if (!ex) return []
      const kg = clampKg(action.kg)
      const history = (ex.history ?? []).map((h, i, a) => (i === a.length - 1 ? { ...h, kg } : h))
      return [update('exercises', action.id, { weight_kg: kg, history })]
    }
    case 'exercise/rename': {
      const name = action.name.trim().slice(0, 60)
      return name && t.exercises[action.id] ? [update('exercises', action.id, { name })] : []
    }
    case 'exercise/remove':
      return [del('exercises', action.id)]
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
