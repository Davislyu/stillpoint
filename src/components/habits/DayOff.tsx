import { useState } from 'react'
import { longDate } from '../../lib/date'
import { addRest, endRest, REST_REASONS, restLabel, restRun } from '../../state/rest'
import { useStore } from '../../state/store'
import type { DateKey, RestReason } from '../../state/types'
import { useThemeCtx } from '../../themes/vibe'
import { Button } from '../ui/Button'

/**
 * Skip a day on purpose (sick, holiday...). A day off keeps your streak, spends no
 * shield, and the week's habit goal shrinks to match. Past days can be marked too.
 */
export function DayOff({ date }: { date: DateKey }) {
  const { state } = useStore()
  const { setRestDays } = useThemeCtx()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<RestReason>('sick')
  const [count, setCount] = useState(1)
  const current = state.restDays[date]
  const run = restRun(state.restDays, date)
  const chip = (on: boolean) => `h-8 rounded-full border px-3 text-[13px] ${on ? 'border-ink-2 bg-surface-2 text-ink' : 'border-line text-muted hover:text-ink'}`

  if (current) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-line-strong bg-surface-2 px-3.5 py-2.5" role="status">
        <p className="min-w-0 text-sm text-ink">
          Day off: {restLabel(current).toLowerCase()}
          {run && run.of > 1 ? ` (day ${run.n} of ${run.of})` : ''}.{' '}
          <span className="text-muted">Your streak is safe; nothing counts against you.</span>
        </p>
        <Button size="sm" variant="secondary" onClick={() => setRestDays(endRest(state.restDays, date))}>
          Back to normal
        </Button>
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mb-3 text-[13px] text-muted underline underline-offset-2 hover:text-ink">
        Take a day off
      </button>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-line-strong bg-surface p-3.5" role="group" aria-label="Take a day off">
      <p className="text-sm text-ink">Skip progress for {longDate(date)}</p>
      <p className="mt-0.5 text-[12px] text-muted">Your streak stays as it is and nothing counts against you.</p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Reason">
        {REST_REASONS.map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={reason === r.id} className={chip(reason === r.id)} onClick={() => setReason(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] text-ink-2">
          For
          <button type="button" aria-label="Fewer days" className="grid size-8 place-items-center rounded-full border border-line hover:bg-surface-2 disabled:opacity-35" disabled={count <= 1} onClick={() => setCount(count - 1)}>
            −
          </button>
          <span className="min-w-14 text-center text-ink tabular">
            {count} {count === 1 ? 'day' : 'days'}
          </span>
          <button type="button" aria-label="More days" className="grid size-8 place-items-center rounded-full border border-line hover:bg-surface-2 disabled:opacity-35" disabled={count >= 14} onClick={() => setCount(count + 1)}>
            +
          </button>
        </span>
        <span className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => (setRestDays(addRest(state.restDays, date, count, reason)), setOpen(false), setCount(1))}>
            Skip {count === 1 ? 'this day' : `${count} days`}
          </Button>
        </span>
      </div>
    </div>
  )
}
