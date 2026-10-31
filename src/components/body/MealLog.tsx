import { useAutosave } from '../../hooks/useAutosave'
import { mealSlots, mealsDone } from '../../state/selectors'
import { useStore } from '../../state/store'
import { useThemeCtx } from '../../themes/vibe'
import type { DateKey, MealNumber } from '../../state/types'
import { PastDayNote } from '../ui/DayContext'
import { CheckIcon } from '../ui/Icons'
import { Panel } from '../ui/Panel'

function MealRow({ date, n }: { date: DateKey; n: MealNumber }) {
  const { state, dispatch } = useStore()
  const meal = state.meals[date]?.[n]
  const done = !!meal?.isCompleted
  const { draft, setDraft, bind } = useAutosave(meal?.notes ?? '', (notes) => dispatch({ type: 'meal/note', date, meal: n, notes }), 600)

  return (
    <li className="flex items-center gap-3 py-2">
      <label className="flex shrink-0 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={done}
          onChange={() => dispatch({ type: 'meal/toggle', date, meal: n })}
        />
        <span
          aria-hidden="true"
          data-done={done}
          className={`check grid size-6 place-items-center rounded-full border-[1.5px] transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink-2 ${
            done ? 'border-accent-sand bg-accent-sand' : 'border-line-strong'
          }`}
        >
          {done && <CheckIcon className="anim-settle text-surface" width={14} height={14} strokeWidth={2.4} />}
        </span>
        <span className={`min-w-14 whitespace-nowrap text-[15px] tabular transition-colors ${done ? 'text-muted' : 'text-ink'}`}>Meal {n}</span>
      </label>
      <input
        aria-label={`Note for meal ${n}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        {...bind}
        maxLength={120}
        placeholder="Add a note"
        className="h-8 min-w-0 flex-1 border-b border-transparent bg-transparent text-sm text-ink-2 placeholder:text-muted/60 hover:border-line focus:border-line-strong focus:outline-none"
      />
    </li>
  )
}

/** Pick how many meals a day: 1 to 5. */
function MealCount() {
  const { prefs, setMealsPerDay } = useThemeCtx()
  const n = prefs.mealsPerDay
  const btn = 'grid size-8 place-items-center rounded-full border border-line text-ink-2 hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-35'
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Meals per day">
      <button type="button" className={btn} aria-label="Fewer meals per day" disabled={n <= 1} onClick={() => setMealsPerDay(n - 1)}>
        −
      </button>
      <span className="min-w-12 text-center text-[12px] text-muted tabular" aria-live="polite">
        {n} a day
      </span>
      <button type="button" className={btn} aria-label="More meals per day" disabled={n >= 5} onClick={() => setMealsPerDay(n + 1)}>
        +
      </button>
    </div>
  )
}

export function MealLog({ date, onBackToToday }: { date: DateKey; onBackToToday: () => void }) {
  const { state, today } = useStore()
  const done = mealsDone(state, date)
  const slots = mealSlots(state)
  return (
    <Panel
      id="meals"
      title="Meals"
      actions={<MealCount />}
      hint={date === today ? `${done} of {slots.length} eaten` : <PastDayNote date={date} today={today} onBackToToday={onBackToToday} />}
    >
      <div className="mb-3 flex gap-1" aria-hidden="true">
        {slots.map((n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              state.meals[date]?.[n]?.isCompleted ? 'bg-accent-sand' : 'bg-surface-2'
            }`}
          />
        ))}
      </div>
      <ul className="divide-y divide-line">
        {slots.map((n) => (
          <MealRow key={`${date}-${n}`} date={date} n={n} />
        ))}
      </ul>
    </Panel>
  )
}
