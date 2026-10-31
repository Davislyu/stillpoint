import { useState } from 'react'
import { accentSoftVar, accentVar } from '../../lib/accents'
import { activeHabits, isDone } from '../../state/selectors'
import { useStore } from '../../state/store'
import { Button } from '../ui/Button'
import { CheckIcon, ShuffleIcon } from '../ui/Icons'

/** Puts one pending habit front and centre, so the list never feels like a wall. */
export function TodaysFocus() {
  const { state, dispatch, today } = useStore()
  const pending = activeHabits(state, today).filter((h) => !isDone(state, h.id, today))
  const [offset, setOffset] = useState(0)
  const habit = pending.length ? pending[offset % pending.length] : null

  if (!habit) {
    return (
      <section
        aria-label="Today's focus"
        className="rounded-2xl border border-dashed border-line-strong px-5 py-6 sm:px-6"
      >
        <p className="text-[13px] text-muted">Today's focus</p>
        <p className="mt-1 font-display text-xl font-medium tracking-[-0.02em] text-ink-2">
          Nothing pending. That's the whole list.
        </p>
      </section>
    )
  }

  return (
    <section
      key={habit.id}
      aria-label="Today's focus"
      className="focus-card anim-rise relative overflow-hidden rounded-2xl px-5 py-6 sm:px-6"
      style={{ background: accentSoftVar(habit.accent) }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accentVar(habit.accent) }}
      />
      <p className="text-[13px] text-ink-2">Today's focus</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <p className="font-display text-[clamp(1.6rem,4vw,2.25rem)] leading-tight font-medium tracking-[-0.03em] text-ink">
          {habit.name}
        </p>
        <div className="flex gap-2">
          {pending.length > 1 && (
            <Button variant="ghost" size="md" onClick={() => setOffset((o) => o + 1)}>
              <ShuffleIcon /> Another
            </Button>
          )}
          <Button variant="primary" size="md" onClick={() => dispatch({ type: 'habit/toggle', id: habit.id, date: today })}>
            <CheckIcon /> Mark done
          </Button>
        </div>
      </div>
    </section>
  )
}
