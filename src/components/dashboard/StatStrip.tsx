import type { ReactNode } from 'react'
import { startOfWeek } from '../../lib/date'
import { completionOn, mealsDone, streakInfo, workoutsInWeek } from '../../state/selectors'
import { useStore } from '../../state/store'
import { WORKOUTS_PER_WEEK } from '../../state/types'

function Stat({ label, value, unit, note }: { label: string; value: ReactNode; unit?: string; note?: ReactNode }) {
  return (
    <div className="min-w-0 px-3 py-4 sm:px-5">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span className="stat-value font-display text-[2rem] leading-none font-medium tracking-[-0.03em] text-ink tabular">
          {value}
        </span>
        {unit && <span className="text-sm text-ink-2">{unit}</span>}
      </dd>
      {note && <dd className="mt-1.5 truncate text-[12px] text-muted">{note}</dd>}
    </div>
  )
}

/**
 * Four stats in one divided strip rather than floating cards: they're read
 * together, so they sit together. Two by two on phones.
 */
export function StatStrip() {
  const { state, today } = useStore()
  const { done, total } = completionOn(state, today)
  const { streak, shields } = streakInfo(state, today)
  const meals = mealsDone(state, today)
  const workouts = workoutsInWeek(state, startOfWeek(today))

  return (
    <dl className="stat-strip grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
      <div className="bg-surface"><Stat label="Habits left today" value={total - done} unit={`of ${total}`} /></div>
      <div className="bg-surface">
        <Stat label="Current streak" value={streak} unit={streak === 1 ? 'day' : 'days'} note={
            <span title="Every 7th streak day earns a shield. A missed day spends one instead of ending your streak.">
              {'🛡'.repeat(shields) || 'Half or more counts'}
              {shields > 0 && ` ${shields} ${shields === 1 ? 'shield' : 'shields'}`}
            </span>
          }
        />
      </div>
      <div className="bg-surface"><Stat label="Meals today" value={meals} unit="of 5" /></div>
      <div className="bg-surface">
        <Stat label="Workouts this week" value={workouts} unit={`of ${WORKOUTS_PER_WEEK}`} />
      </div>
    </dl>
  )
}
