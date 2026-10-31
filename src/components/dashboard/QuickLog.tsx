import { useEffect } from 'react'
import { startOfWeek } from '../../lib/date'
import { activeHabits, isDone, mealSlots, mealsDone, workoutsInWeek } from '../../state/selectors'
import { useStore } from '../../state/store'
import { WORKOUTS_PER_WEEK } from '../../state/types'
import { Button } from '../ui/Button'

/** Everything you log in a day, in one sheet: three taps and you're done. */
export default function QuickLog({ onClose, onSpend }: { onClose: () => void; onSpend: () => void }) {
  const { state, today, dispatch } = useStore()
  const habits = activeHabits(state, today)
  const week = startOfWeek(today)
  const workouts = workoutsInWeek(state, week)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const chip = (on: boolean) =>
    `min-h-11 rounded-full border px-4 text-sm transition-[background-color,transform] duration-150 active:scale-95 ${on ? 'border-ink bg-ink text-bg hover:bg-ink-2' : 'border-line-strong text-ink-2 hover:bg-surface-2'}`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-title"
        onClick={(e) => e.stopPropagation()}
        className="sheet anim-rise flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-line bg-bg shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id="quick-title" className="font-display text-xl font-medium text-ink">
            Quick log
          </h2>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </header>
        <div className="space-y-6 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <section aria-label="Habits">
            <h3 className="mb-2 text-[13px] text-ink-2">Habits today</h3>
            {habits.length === 0 ? (
              <p className="text-sm text-muted">No habits yet. Add one on the Today tab.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {habits.map((h) => {
                  const on = isDone(state, h.id, today)
                  return (
                    <button key={h.id} type="button" aria-pressed={on} className={chip(on)} onClick={() => dispatch({ type: 'habit/toggle', id: h.id, date: today })}>
                      {on && '✓ '}
                      {h.name}
                    </button>
                  )
                })}
              </div>
            )}
          </section>
          <section aria-label="Meals">
            <h3 className="mb-2 text-[13px] text-ink-2">
              Meals <span className="text-muted tabular">{mealsDone(state, today)} of {state.mealsPerDay}</span>
            </h3>
            <div className="flex gap-2">
              {mealSlots(state).map((n) => {
                const on = !!state.meals[today]?.[n]?.isCompleted
                return (
                  <button key={n} type="button" aria-pressed={on} aria-label={`Meal ${n}`} className={`${chip(on)} flex-1 px-0`} onClick={() => dispatch({ type: 'meal/toggle', date: today, meal: n })}>
                    {n}
                  </button>
                )
              })}
            </div>
          </section>
          <section aria-label="Workout" className="flex items-center justify-between gap-3">
            <h3 className="text-[13px] text-ink-2">
              Workouts this week <span className="text-muted tabular">{workouts} of {WORKOUTS_PER_WEEK}</span>
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={workouts === 0} aria-label="Remove a workout" onClick={() => dispatch({ type: 'workout/set', weekStart: week, count: workouts - 1 })}>
                −
              </Button>
              <Button size="sm" disabled={workouts >= WORKOUTS_PER_WEEK} onClick={() => dispatch({ type: 'workout/set', weekStart: week, count: workouts + 1 })}>
                + Workout
              </Button>
            </div>
          </section>
          <Button className="w-full" onClick={onSpend}>
            Log extra spending
          </Button>
        </div>
      </div>
    </div>
  )
}
