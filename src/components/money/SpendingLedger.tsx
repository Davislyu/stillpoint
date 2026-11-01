import { useState } from 'react'
import { addMonths, longDate, monthLabel, monthOf, type MonthKey } from '../../lib/date'
import { categoryLabel, useMoney } from '../../lib/money'
import { CURRENCIES } from '../../themes/vibe'
import { monthJustifiedCents, monthTotalCents, spendingsInMonth } from '../../state/selectors'
import { useStore } from '../../state/store'
import { IconButton } from '../ui/Button'
import { XIcon } from '../ui/Icons'
import { Panel } from '../ui/Panel'
import { SpendingForm } from './SpendingForm'

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d={dir === 'left' ? 'M10 3.5L5.5 8l4.5 4.5' : 'M6 3.5L10.5 8 6 12.5'} />
  </svg>
)

export function SpendingLedger() {
  const { state, dispatch, today } = useStore()
  const { format: formatCents, currency, setCurrency } = useMoney()
  const current = monthOf(today)
  const [month, setMonth] = useState<MonthKey>(current)
  const total = monthTotalCents(state, month)
  const justifiedTotal = monthJustifiedCents(state, month)
  const previous = monthTotalCents(state, addMonths(month, -1))
  const entries = spendingsInMonth(state, month)
  const oldest = addMonths(current, -12) // matches the server's loaded window

  let comparison = ''
  if (previous > 0) {
    const diff = total - previous
    comparison =
      diff === 0
        ? `Same as ${monthLabel(addMonths(month, -1)).split(' ')[0]}.`
        : `${formatCents(Math.abs(diff))} ${diff < 0 ? 'less' : 'more'} than ${monthLabel(addMonths(month, -1)).split(' ')[0]}.`
  }

  // Group the month's entries by day, newest first.
  const days = [...new Set(entries.map((e) => e.date))]

  return (
    <Panel
      id="spending"
      title="Extra spendings"
      hint="Leaks count against you. Unavoidable payments can be marked justified and never will."
      actions={
        <div role="radiogroup" aria-label="Currency" className="flex rounded-full border border-line p-0.5">
          {CURRENCIES.map((c) => (
            <button
              key={c.id}
              role="radio"
              aria-checked={currency === c.id}
              title={c.label}
              onClick={() => setCurrency(c.id)}
              className={`grid h-7 min-w-8 place-items-center rounded-full px-2 text-[13px] ${currency === c.id ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'}`}
            >
              {c.symbol}
            </button>
          ))}
        </div>
      }
    >
      <div className="rounded-xl bg-bg px-4 py-4">
        <div className="flex items-center justify-between">
          <IconButton aria-label="Previous month" disabled={month <= oldest} onClick={() => setMonth(addMonths(month, -1))} className="disabled:opacity-30">
            <Chevron dir="left" />
          </IconButton>
          <span className="text-[13px] text-ink-2">{monthLabel(month)}</span>
          <IconButton aria-label="Next month" disabled={month >= current} onClick={() => setMonth(addMonths(month, 1))} className="disabled:opacity-30">
            <Chevron dir="right" />
          </IconButton>
        </div>
        <p className="mt-2 text-center font-display text-[2.75rem] leading-none font-medium tracking-[-0.04em] text-ink tabular" aria-live="polite">
          {formatCents(total)}
        </p>
        <p className="mt-2 text-center text-[13px] text-muted">
          in extras {month === current ? 'so far this month' : 'that month'}
          {entries.length > 0 && `, across ${entries.filter((e) => !e.justified).length} ${entries.filter((e) => !e.justified).length === 1 ? 'entry' : 'entries'}`}.
          {justifiedTotal > 0 && <span className="block">Plus {formatCents(justifiedTotal)} justified, not counted.</span>}
          {comparison && <span className="block">{comparison}</span>}
        </p>
      </div>

      <div className="mt-5">
        <SpendingForm />
      </div>

      {days.length > 0 ? (
        <div className="mt-5 space-y-4 border-t border-line pt-4">
          {days.map((d) => (
            <div key={d}>
              <h3 className="mb-1 text-[12px] text-muted">{d === today ? 'Today' : longDate(d)}</h3>
              <ul>
                {entries
                  .filter((e) => e.date === d)
                  .map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-1.5 text-sm">
                      <span className="min-w-0 flex-1 truncate text-ink">{e.description}</span>
                      <button
                        type="button"
                        aria-pressed={e.justified}
                        aria-label={`${e.justified ? 'Unmark' : 'Mark'} ${e.description} as justified`}
                        title={e.justified ? 'Justified: not counted. Tap to count it.' : 'Tap to mark as justified (not counted)'}
                        onClick={() => dispatch({ type: 'spending/justify', id: e.id, justified: !e.justified })}
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${e.justified ? 'border-ink-2 bg-surface-2 text-ink' : 'border-line text-muted hover:text-ink'}`}
                      >
                        Justified
                      </button>
                      <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                        {categoryLabel(e.category)}
                      </span>
                      <span className="text-ink tabular">{formatCents(e.amountCents)}</span>
                      <IconButton
                        aria-label={`Remove ${e.description}`}
                        className="-mr-2 size-7"
                        onClick={() => dispatch({ type: 'spending/remove', id: e.id })}
                      >
                        <XIcon width={14} height={14} />
                      </IconButton>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          Nothing logged for {month === current ? 'this month yet' : 'this month'}.
        </p>
      )}
    </Panel>
  )
}
