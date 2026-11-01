import { useEffect, useState } from 'react'
import { dayOfMonth, longDate, weekdayShort } from '../../lib/date'
import { completionHistory, STREAK_THRESHOLD } from '../../state/selectors'
import { useStore } from '../../state/store'
import type { DateKey } from '../../state/types'
import { Panel } from '../ui/Panel'

interface Props {
  selected: DateKey
  onSelect: (day: DateKey) => void
}

/**
 * Fourteen columns that fill like a glass to each day's completion share.
 * The dashed line marks the 50 % that keeps a streak going.
 * Tap a day to tick off habits you forgot to log.
 */
export function HistoryStrip({ selected, onSelect }: Props) {
  const { state, today } = useStore()
  const days = completionHistory(state, today)
  const tracked = days.filter((d) => d.share !== null)
  const avg = tracked.length ? tracked.reduce((a, d) => a + (d.share ?? 0), 0) / tracked.length : null

  // Columns start empty and fill once on mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <Panel
      id="history"
      title="Last 14 days"
      hint={
        avg === null
          ? 'Your days will fill in here.'
          : `Averaging ${Math.round(avg * 100)}% of habits on tracked days. Tap a day to edit it.`
      }
    >
      <div className="relative [--col-h:6.5rem] sm:[--col-h:8rem]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-1 z-10 border-t border-dashed border-ink-2/50"
          style={{ top: `calc((1 - ${STREAK_THRESHOLD}) * var(--col-h))` }}
        />
        <ol className="grid grid-cols-14 gap-1 sm:gap-2">
          {days.map((d) => {
            const pct = d.share === null ? null : Math.round(d.share * 100)
            const isSelected = d.date === selected
            const isToday = d.date === today
            const strong = d.share !== null && d.share >= STREAK_THRESHOLD
            const off = state.restDays[d.date]
            const label = off
              ? `${longDate(d.date)}: day off (${off})`
              : pct === null
                ? `${longDate(d.date)}: not tracked`
                : `${longDate(d.date)}: ${pct}% (${d.done} of ${d.total})`
            return (
              <li key={d.date} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onSelect(d.date)}
                  aria-label={label}
                  aria-pressed={isSelected}
                  title={label}
                  className={`col group relative w-full overflow-hidden rounded-full border transition-colors h-[var(--col-h)] ${
                    isSelected ? 'border-ink-2' : 'border-line hover:border-line-strong'
                  } ${pct === null ? 'bg-transparent' : 'bg-surface-2'}`}
                  data-off={off ? 'true' : undefined}
                >
                  {off && (
                    <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-[11px] text-muted" style={{ background: 'repeating-linear-gradient(135deg, transparent 0 4px, var(--line) 4px 5px)' }}>
                      <span className="rounded bg-bg px-0.5">off</span>
                    </span>
                  )}
                  <span
                    className="col-fill fill-col absolute inset-x-0 bottom-0 rounded-full"
                    style={{
                      height: mounted && pct ? `${Math.max(pct, 8)}%` : '0%',
                      background: strong ? 'var(--ink-2)' : 'var(--line-strong)',
                    }}
                  />
                </button>
                <span className="mt-2 text-[11px] leading-none text-muted">{weekdayShort(d.date)}</span>
                <span
                  className={`mt-1 grid size-5 place-items-center rounded-full text-[11px] leading-none tabular ${
                    isToday ? 'bg-ink font-semibold text-bg' : 'text-ink-2'
                  }`}
                >
                  {dayOfMonth(d.date)}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-ink-2" aria-hidden="true" /> Half or more
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-line-strong" aria-hidden="true" /> Under half
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-line-strong" style={{ background: 'repeating-linear-gradient(135deg, transparent 0 2px, var(--line-strong) 2px 3px)' }} aria-hidden="true" /> Day off
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-line-strong" aria-hidden="true" /> Streak line
        </span>
      </p>
    </Panel>
  )
}
