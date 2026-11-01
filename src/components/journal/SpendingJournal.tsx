import { useMemo, useState } from 'react'
import { addMonths, fromKey, longDate, monthLabel, monthOf, type MonthKey } from '../../lib/date'
import { categoryLabel, useMoney } from '../../lib/money'
import { monthReport, share, totalOf, trend, weekdayAverages } from '../../spending/analytics'
import { useStore } from '../../state/store'
import { SpendingForm } from '../money/SpendingForm'
import { XIcon } from '../ui/Icons'
import { ChartCard, COUNTED, JUSTIFIED, Legend, PaceChart, RankedBars, StackedBars } from './charts'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d={dir === 'left' ? 'M10 3.5L5.5 8l4.5 4.5' : 'M6 3.5L10.5 8 6 12.5'} />
  </svg>
)

/** Log every payment, then read the month: totals, pace, categories, trend, weekday habits. */
export function SpendingJournal({ hide }: { hide: boolean }) {
  const { state, dispatch, today } = useStore()
  const { format, symbol } = useMoney()
  const current = monthOf(today)
  const [month, setMonth] = useState<MonthKey>(current)
  const [openForm, setOpenForm] = useState(state.spendings.length === 0)
  const [onlyCounted, setOnlyCounted] = useState(false)

  const all = state.spendings
  const r = useMemo(() => monthReport(all, month, today), [all, month, today])
  const prev = useMemo(() => monthReport(all, addMonths(month, -1), today), [all, month, today])
  const t6 = useMemo(() => trend(all, month), [all, month])
  const dow = useMemo(() => weekdayAverages(all, today), [all, today])
  const elapsed = month === current ? Number(today.slice(8, 10)) : month < current ? r.days.length : 0
  const total = totalOf(r)
  const prevTotal = totalOf(prev)
  const delta = prevTotal > 0 ? (total - prevTotal) / prevTotal : null
  const entries = useMemo(() => all.filter((x) => monthOf(x.date) === month && (!onlyCounted || !x.justified)).sort((a, b) => b.date.localeCompare(a.date)), [all, month, onlyCounted])
  const byDay = useMemo(() => {
    const m = new Map<string, typeof entries>()
    for (const e of entries) (m.get(e.date) ?? m.set(e.date, []).get(e.date)!).push(e)
    return [...m.entries()]
  }, [entries])
  const monthName = monthLabel(month).split(' ')[0]
  const prevName = monthLabel(addMonths(month, -1)).split(' ')[0]
  const legend = <Legend items={[['Counts toward progress', COUNTED], ['Justified', JUSTIFIED]]} />

  const kpis: [string, string, string?][] = [
    ['total', format(total)],
    ['vs ' + prevName.toLowerCase().slice(0, 3), delta === null ? '–' : `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%`, delta === null ? undefined : delta > 0 ? 'up' : 'down'],
    ['per day', format(r.perDay)],
    ['payments', String(r.count)],
    ['biggest', r.biggest ? format(r.biggest.amountCents) : '–'],
    ['justified', `${Math.round(share(r.justified, total) * 100)}%`],
  ]

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous month" className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2" onClick={() => setMonth(addMonths(month, -1))}>
            <Chevron dir="left" />
          </button>
          <span className="min-w-28 text-center font-mono text-[13px] text-ink" aria-live="polite">
            {monthLabel(month)}
          </span>
          <button type="button" aria-label="Next month" disabled={month >= current} className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-30" onClick={() => setMonth(addMonths(month, 1))}>
            <Chevron dir="right" />
          </button>
        </div>
        <button type="button" onClick={() => setOpenForm((o) => !o)} aria-expanded={openForm} className="h-8 rounded-full bg-ink px-3.5 text-[13px] font-medium text-bg hover:bg-ink-2">
          {openForm ? 'Close' : '+ Log a payment'}
        </button>
      </div>

      {openForm && (
        <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3.5">
          <SpendingForm />
        </div>
      )}

      <dl className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line font-mono sm:grid-cols-6" aria-label="Spending statistics">
        {kpis.map(([k, v, tone]) => (
          <div key={k} className="bg-surface px-2.5 py-1.5">
            <dt className="text-[10px] tracking-wider text-muted uppercase">{k}</dt>
            <dd className="text-[15px] text-ink tabular">
              {v}
              {tone && <span aria-hidden="true" className="ml-0.5 text-[11px] text-muted">{tone === 'up' ? '▲' : '▼'}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {r.count === 0 ? (
        <p className="mt-5 text-center text-sm text-muted">No payments in {monthLabel(month)}. Log one and the charts appear here.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          <ChartCard title="Daily spend" note={`${monthName}, ${symbol}`} legend={legend}>
            <StackedBars
              bars={r.days.map((d) => ({ label: String(d.day), title: longDate(d.date), counted: d.counted, justified: d.justified }))}
              tickEvery={5}
              highlight={month === current ? elapsed - 1 : undefined}
              format={format}
            />
          </ChartCard>

          <ChartCard title="Pace" note={`running total vs ${prevName}`} legend={<Legend items={[[monthName, COUNTED], [prevName, 'var(--muted)']]} />}>
            <PaceChart now={r.cumulative} before={prev.cumulative} nowLabel={monthName} beforeLabel={prevName} elapsed={elapsed} format={format} />
          </ChartCard>

          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard title="Where it went" note="by category" legend={legend}>
              <RankedBars rows={r.categories.map((c) => ({ ...c, label: categoryLabel(c.id) }))} format={format} />
            </ChartCard>
            <ChartCard title="Weekday pattern" note="avg per day, last 12 weeks">
              <StackedBars bars={dow.map((v, i) => ({ label: WEEKDAYS[i], title: WEEKDAYS[i], counted: v, justified: 0 }))} height={140} format={format} />
            </ChartCard>
          </div>

          <ChartCard title="Six months" note={`to ${monthName}`} legend={legend}>
            <StackedBars bars={t6.map((m) => ({ label: monthLabel(m.month).slice(0, 3), title: monthLabel(m.month), counted: m.counted, justified: m.justified }))} highlight={5} format={format} height={150} />
          </ChartCard>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] tracking-wider text-ink-2 uppercase">Ledger</h3>
        <label className="flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-muted">
          <input type="checkbox" checked={onlyCounted} onChange={(e) => setOnlyCounted(e.target.checked)} className="size-3.5 accent-current" />
          hide justified
        </label>
      </div>
      {byDay.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing logged.</p>
      ) : (
        <ul className="mt-2 grid gap-3" aria-label="Payments">
          {byDay.map(([date, list]) => (
            <li key={date}>
              <p className="mb-1 flex justify-between font-mono text-[11px] text-muted">
                <span>
                  {date} {fromKey(date).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span className="tabular">{format(list.reduce((a, e) => a + e.amountCents, 0))}</span>
              </p>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-2">
                {list.map((e) => (
                  <li key={e.id} className="flex items-center gap-2.5 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm text-ink ${hide ? 'blur-[5px] select-none' : ''}`}>{e.description}</span>
                      <span className="block font-mono text-[11px] text-muted">{categoryLabel(e.category)}</span>
                    </span>
                    <button
                      type="button"
                      aria-pressed={e.justified}
                      aria-label={`${e.justified ? 'Unmark' : 'Mark'} ${e.description} as justified`}
                      title={e.justified ? 'Justified: not counted. Tap to count it.' : 'Tap to mark as justified (not counted)'}
                      onClick={() => dispatch({ type: 'spending/justify', id: e.id, justified: !e.justified })}
                      className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] ${e.justified ? 'border-ink-2 bg-surface-2 text-ink' : 'border-line text-muted hover:text-ink'}`}
                    >
                      justified
                    </button>
                    <span className="w-20 text-right font-mono text-sm text-ink tabular">{format(e.amountCents)}</span>
                    <button type="button" aria-label={`Delete ${e.description}`} className="grid size-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink" onClick={() => dispatch({ type: 'spending/remove', id: e.id })}>
                      <XIcon width={14} height={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
