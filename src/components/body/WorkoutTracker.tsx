import { addDays, daysBetween, shortDate, startOfWeek } from '../../lib/date'
import { recentWeeks, workoutsInWeek } from '../../state/selectors'
import { useStore } from '../../state/store'
import { WORKOUTS_PER_WEEK } from '../../state/types'
import { Button } from '../ui/Button'
import { PlusIcon } from '../ui/Icons'
import { Panel } from '../ui/Panel'

export function WorkoutTracker() {
  const { state, dispatch, today } = useStore()
  const week = startOfWeek(today)
  const count = workoutsInWeek(state, week)
  const left = WORKOUTS_PER_WEEK - count
  const daysLeft = 7 - daysBetween(week, today) // including today
  const history = recentWeeks(today, 8).slice(0, -1)
  const set = (n: number) => dispatch({ type: 'workout/set', weekStart: week, count: n })

  const hint =
    left === 0
      ? 'All four done this week.'
      : `${left} to go, ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left this week.`

  return (
    <Panel id="workouts" title="Workouts" hint={`Four a week, Monday to Sunday. ${hint}`}>
      <div className="flex items-end justify-between gap-4">
        <p className="font-display leading-none tracking-[-0.04em] text-ink tabular" aria-live="polite">
          <span className="text-[3.25rem] font-medium">{count}</span>
          <span className="text-2xl text-muted"> / {WORKOUTS_PER_WEEK}</span>
          <span className="sr-only"> workouts completed this week</span>
        </p>
        <p className="pb-1 text-right text-[13px] text-muted">
          completed this week
          <br />
          {shortDate(week)} to {shortDate(addDays(week, 6))}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden="true">
        {Array.from({ length: WORKOUTS_PER_WEEK }, (_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-colors duration-300 ${i < count ? 'bg-accent-dusk' : 'bg-surface-2'}`}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button variant="primary" size="lg" className="flex-1" disabled={count >= WORKOUTS_PER_WEEK} onClick={() => set(count + 1)}>
          {count >= WORKOUTS_PER_WEEK ? (
            'Week complete'
          ) : (
            <>
              <PlusIcon /> Log a workout
            </>
          )}
        </Button>
        {count > 0 && (
          <Button variant="ghost" onClick={() => set(count - 1)} aria-label="Undo the last logged workout">
            Undo
          </Button>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <p className="mb-2 text-[13px] text-ink-2">Previous weeks</p>
        <ol className="flex items-end gap-2">
          {history.map((w) => {
            const n = workoutsInWeek(state, w)
            return (
              <li key={w} className="flex flex-1 flex-col items-center gap-1" title={`Week of ${shortDate(w)}: ${n} of 4`}>
                <div className="flex h-10 w-full flex-col-reverse gap-0.5">
                  {Array.from({ length: WORKOUTS_PER_WEEK }, (_, i) => (
                    <span key={i} className={`flex-1 rounded-[3px] ${i < n ? 'bg-accent-dusk' : 'bg-surface-2'}`} />
                  ))}
                </div>
                <span className="text-[10px] text-muted tabular">{shortDate(w)}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </Panel>
  )
}
