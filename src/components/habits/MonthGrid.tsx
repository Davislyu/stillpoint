import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { addDays, addMonths, fromKey, monthLabel } from '../../lib/date'
import { isActiveOn, isDone, isRest } from '../../state/selectors'
import { useStore } from '../../state/store'
import type { DateKey } from '../../state/types'
import { Panel } from '../ui/Panel'

const WEEK_COLORS = ['var(--accent-dusk)', 'var(--accent-teal)', 'var(--accent-mauve)', 'var(--accent-sage)', 'var(--accent-sand)', 'var(--accent-clay)']
const COL = 'minmax(1.2rem,1fr)'

/**
 * The month as one quiet grid: habits down the side, days across, weeks banded by colour.
 * Tap a square to tick that day. The bars underneath show how much of each day you finished.
 */
export function MonthGrid() {
  const { state, dispatch, today } = useStore()
  const current = today.slice(0, 7)
  const [month, setMonth] = useState(current)

  const days = useMemo(() => {
    const first = `${month}-01`
    const out: DateKey[] = []
    for (let d = first; d.startsWith(month); d = addDays(d, 1)) out.push(d)
    return out
  }, [month])

  const habits = state.habits.filter((h) => h.createdOn <= days[days.length - 1] && (!h.archivedOn || h.archivedOn > days[0]))
  const weekOf = (d: DateKey) => {
    const offset = (fromKey(days[0]).getDay() + 6) % 7 // Monday-first
    return Math.floor((Number(d.slice(8)) - 1 + offset) / 7)
  }

  const share = (d: DateKey) => {
    const act = state.habits.filter((h) => isActiveOn(h, d))
    return act.length ? act.filter((h) => isDone(state, h.id, d)).length / act.length : null
  }
  const tracked = days.filter((d) => d <= today && share(d) !== null && !isRest(state, d))
  const avg = tracked.length ? tracked.reduce((a, d) => a + (share(d) ?? 0), 0) / tracked.length : null
  const doneCount = habits.reduce((n, h) => n + days.filter((d) => isDone(state, h.id, d)).length, 0)
  const oldest = state.habits.reduce((m, h) => (h.createdOn.slice(0, 7) < m ? h.createdOn.slice(0, 7) : m), current)

  // Start scrolled so today is in view.
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scroller.current
    const t = el?.querySelector<HTMLElement>('[data-today]')
    if (el && t) el.scrollLeft = Math.max(0, t.offsetLeft - el.clientWidth / 2)
  }, [month])

  // Weeks as spans for the header band.
  const weeks: { w: number; from: number; len: number }[] = []
  days.forEach((d, i) => {
    const w = weekOf(d)
    const last = weeks[weeks.length - 1]
    if (last && last.w === w) last.len++
    else weeks.push({ w, from: i, len: 1 })
  })

  const cols = `grid-template-columns: minmax(6rem,8rem) repeat(${days.length}, ${COL}) 3rem`
  const minW = `${6 * 16 + days.length * 22 + 48}px`

  return (
    <Panel
      id="month"
      title={monthLabel(month)}
      hint={avg === null ? 'Your month fills in as you tick habits.' : `${Math.round(avg * 100)}% on tracked days · ${doneCount} ticks`}
      actions={
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous month" disabled={month <= oldest} onClick={() => setMonth(addMonths(month, -1))} className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-30">‹</button>
          <button type="button" aria-label="Next month" disabled={month >= current} onClick={() => setMonth(addMonths(month, 1))} className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-30">›</button>
        </div>
      }
    >
      {habits.length === 0 ? (
        <p className="text-sm text-muted">Add a habit and its month appears here.</p>
      ) : (
        <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          <div role="grid" aria-label={`Habits in ${monthLabel(month)}`} className="grid gap-y-1 text-[11px]" style={{ minWidth: minW, gridTemplateColumns: undefined }}>
            {/* week bands */}
            <div className="grid items-center gap-x-[3px]" style={{ ...cssCols(cols) }}>
              <span />
              {weeks.map((w) => (
                <span
                  key={w.from}
                  className="truncate rounded-[5px] px-1.5 py-0.5 text-center text-[10px] font-medium tracking-wide text-bg"
                  style={{ gridColumn: `${w.from + 2} / span ${w.len}`, background: WEEK_COLORS[w.w % WEEK_COLORS.length] }}
                >
                  {w.len >= 4 ? `Week ${w.w + 1}` : w.len >= 2 ? `W${w.w + 1}` : ''}
                </span>
              ))}
              <span />
            </div>
            {/* day numbers */}
            <div className="grid items-end gap-x-[3px] text-muted" style={cssCols(cols)}>
              <span />
              {days.map((d) => (
                <span key={d} data-today={d === today || undefined} className={`text-center tabular ${d === today ? 'font-semibold text-ink' : ''}`}>
                  <span className="block text-[9px] opacity-70">{'MTWTFSS'[(fromKey(d).getDay() + 6) % 7]}</span>
                  {Number(d.slice(8))}
                </span>
              ))}
              <span />
            </div>
            {habits.map((h) => {
              const n = days.filter((d) => isDone(state, h.id, d)).length
              const possible = days.filter((d) => d <= today && isActiveOn(h, d) && !isRest(state, d)).length
              return (
                <div key={h.id} role="row" className="grid items-center gap-x-[3px]" style={cssCols(cols)}>
                  <span className="truncate pr-2 text-[12.5px] text-ink-2">{h.name}</span>
                  {days.map((d) => {
                    const done = isDone(state, h.id, d)
                    const future = d > today
                    const off = isRest(state, d)
                    return (
                      <button
                        key={d}
                        type="button"
                        role="gridcell"
                        disabled={future}
                        aria-pressed={done}
                        aria-label={`${h.name}, ${d}${done ? ', done' : ''}`}
                        onClick={() => dispatch({ type: 'habit/toggle', id: h.id, date: d })}
                        className={`aspect-square w-full rounded-[5px] border transition-colors duration-150 ${
                          done ? 'border-transparent' : off ? 'border-dashed border-line' : future ? 'border-line/40' : 'border-line hover:border-line-strong'
                        } ${future ? 'opacity-40' : ''}`}
                        style={done ? { background: WEEK_COLORS[weekOf(d) % WEEK_COLORS.length] } : undefined}
                      />
                    )
                  })}
                  <span className="text-right text-[11px] text-muted tabular">{n}{possible ? `/${possible}` : ''}</span>
                </div>
              )
            })}
            {/* progress bars */}
            <div className="mt-2 grid items-end gap-x-[3px] border-t border-line pt-2" style={{ ...cssCols(cols), height: '3.25rem' }}>
              <span className="self-center text-[11px] text-muted">Progress</span>
              {days.map((d) => {
                const s = d > today || isRest(state, d) ? null : share(d)
                return (
                  <span key={d} className="flex h-full items-end" title={s === null ? undefined : `${Math.round(s * 100)}%`}>
                    <span
                      className="block w-full rounded-[3px]"
                      style={{ height: s === null ? 2 : `${Math.max(6, s * 100)}%`, background: s === null ? 'var(--line)' : WEEK_COLORS[weekOf(d) % WEEK_COLORS.length], opacity: s === null ? 1 : 0.35 + 0.65 * s }}
                    />
                  </span>
                )
              })}
              <span />
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}

/** Tailwind can't take a dynamic column count, so the template goes in as an inline style. */
function cssCols(cols: string): CSSProperties {
  return { gridTemplateColumns: cols.replace('grid-template-columns: ', '') }
}
