import type { TableStore } from '../data/schema'
import type { AppState, MealNumber } from './types'

/** Synced rows (snake_case, keyed) → the read model components use. */
export function toAppState(t: TableStore): AppState {
  const completions: AppState['completions'] = {}
  for (const c of Object.values(t.habit_completions)) (completions[c.date] ??= []).push(c.habit_id)

  const meals: AppState['meals'] = {}
  for (const m of Object.values(t.meals)) {
    ;(meals[m.date] ??= {})[m.meal_number as MealNumber] = { isCompleted: !!m.is_completed, notes: m.notes ?? '' }
  }

  return {
    mealsPerDay: 5,
    habits: Object.values(t.habits).map((h) => ({
      id: h.id,
      name: h.name,
      accent: h.accent,
      createdOn: h.created_on,
      archivedOn: h.archived_on ?? undefined,
    })),
    completions,
    milestones: Object.fromEntries(Object.values(t.milestones).map((m) => [m.milestone_key, m.reached_on])),
    observations: Object.fromEntries(
      Object.values(t.daily_observations).map((o) => [
        o.date,
        { criticalThinking: o.critical_thinking_text ?? '', observations: o.observations_text ?? '' },
      ]),
    ),
    meals,
    workouts: Object.fromEntries(Object.values(t.workouts).map((w) => [w.week_start_date, w.workout_count ?? 0])),
    spendings: Object.values(t.non_essential_spendings)
      .map((s) => ({
        id: s.id,
        date: s.date,
        amountCents: Math.round(Number(s.amount) * 100),
        description: s.description,
        category: s.category,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    notes: Object.values(t.notes ?? {})
      .map((n) => ({ id: n.id, date: n.date, title: n.title ?? '', body: n.body ?? '' }))
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
    exercises: Object.values(t.exercises ?? {})
      .map((e) => ({
        id: e.id,
        name: e.name,
        kg: Number(e.weight_kg) || 0,
        reps: e.reps || 1,
        createdOn: e.created_on,
        prOn: e.pr_on ?? null,
        history: Array.isArray(e.history) ? e.history : [],
      }))
      .sort((a, b) => a.createdOn.localeCompare(b.createdOn) || a.id.localeCompare(b.id)),
  }
}
