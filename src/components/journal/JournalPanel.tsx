import { useMemo, useState } from 'react'
import { buildEntries, filterEntries, flashback, journalStats, level, readMinutes, snippet, type Entry, type Kind } from '../../journal/entries'
import { addDays, fromKey, longDate, startOfWeek } from '../../lib/date'
import { useHide } from '../../hooks/useHide'
import { useStore } from '../../state/store'
import type { DateKey } from '../../state/types'
import { Button } from '../ui/Button'
import { inputClass } from '../ui/Field'
import { HideToggle } from '../ui/HideToggle'
import { Veil } from '../ui/Veil'
import { Panel } from '../ui/Panel'
import { SpendingJournal } from './SpendingJournal'

const WEEKS = 26
const heat = (lv: number) => (lv === 0 ? 'var(--surface-2)' : `color-mix(in oklab, var(--accent-teal) ${[0, 28, 50, 75, 100][lv]}%, var(--surface-2))`)

function Heatmap({ entries, today, active, onPick }: { entries: Entry[]; today: DateKey; active: DateKey | null; onPick: (d: DateKey) => void }) {
  const by = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries])
  const start = addDays(startOfWeek(today), -7 * (WEEKS - 1))
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i))
  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]" role="group" aria-label={`Writing activity, last ${WEEKS} weeks`}>
        {days.map((d) => {
          const e = by.get(d)
          const future = d > today
          return (
            <button
              key={d}
              type="button"
              disabled={future || !e}
              onClick={() => onPick(d)}
              aria-label={e ? `${longDate(d)}: ${e.words} words` : `${longDate(d)}: no entry`}
              title={e ? `${d} · ${e.words} words` : d}
              className={`size-[11px] rounded-[2px] ${active === d ? 'outline-2 outline-offset-1 outline-ink' : ''} ${future ? 'opacity-0' : ''} ${e ? 'cursor-pointer hover:outline-1 hover:outline-ink-2' : 'cursor-default'}`}
              style={{ background: heat(level(e?.words ?? 0)) }}
            />
          )
        })}
      </div>
    </div>
  )
}

function Section({ tag, text, q, hide }: { tag: string; text: string; q: string; hide: boolean }) {
  if (!text) return null
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] tracking-wider text-muted uppercase">// {tag}</p>
      <p className={`mt-0.5 text-[13px] leading-relaxed text-ink-2 ${hide ? 'blur-[5px] select-none' : ''}`}>{snippet(text, q)}</p>
    </div>
  )
}

function EntryRow({ e, q, open, onToggle, hide, onEdit }: { e: Entry; q: string; open: boolean; onToggle: () => void; hide: boolean; onEdit?: (d: DateKey) => void }) {
  const full = (label: string, text: string) =>
    text && (
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-wider text-muted uppercase">// {label}</p>
        <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-wrap text-ink">{text}</p>
      </div>
    )
  return (
    <li id={`journal-${e.date}`} className={`rounded-xl border bg-surface-2 ${open ? 'border-line-strong' : 'border-line'}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left">
        <span className="font-mono text-[12px] text-ink">
          <span className="text-muted">#{String(e.no).padStart(4, '0')}</span> {e.date} <span className="text-muted">{fromKey(e.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
        </span>
        <span className="font-mono text-[11px] text-muted tabular">
          {e.words} w · {readMinutes(e.words)} min
        </span>
      </button>
      <div className="grid gap-3 px-3.5 pb-3 sm:grid-cols-2">
        {open ? (
          <>
            {full('thinking', e.thinking)}
            {full('observations', e.observations)}
          </>
        ) : (
          <>
            <Section tag="thinking" text={e.thinking} q={q} hide={hide} />
            <Section tag="observations" text={e.observations} q={q} hide={hide} />
          </>
        )}
      </div>
      {open && onEdit && (
        <div className="flex justify-end px-3.5 pb-3">
          <Button size="sm" variant="secondary" onClick={() => onEdit(e.date)}>
            Edit this day
          </Button>
        </div>
      )}
    </li>
  )
}

/** Read-only archive of everything written under "Thinking and observations". Writing happens in that panel. */
export function JournalPanel({ onEdit }: { onEdit?: (d: DateKey) => void }) {
  const { state, today } = useStore()
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<Kind>('all')
  const [open, setOpen] = useState<DateKey | null>(null)
  const [shown, setShown] = useState(15)
  const [hide] = useHide()
  const [tab, setTab] = useState<'writing' | 'spending'>('writing')

  const entries = useMemo(() => buildEntries(state.observations), [state.observations])
  const stats = useMemo(() => journalStats(entries, today), [entries, today])
  const list = useMemo(() => filterEntries(entries, q, kind), [entries, q, kind])
  const back = useMemo(() => flashback(entries, today), [entries, today])

  const pick = (d: DateKey) => {
    setOpen(d)
    setQ('')
    setKind('all')
    const at = entries.findIndex((e) => e.date === d)
    if (at >= shown) setShown(at + 1)
    requestAnimationFrame(() => document.getElementById(`journal-${d}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }
  const chip = (on: boolean) => `h-7 rounded-full border px-2.5 font-mono text-[11px] ${on ? 'border-ink-2 bg-surface-2 text-ink' : 'border-line text-muted hover:text-ink'}`

  return (
    <Panel
      id="journal"
      title="Journal"
      hint={tab === 'writing' ? 'Everything you wrote under Thinking and observations. Private to your account.' : 'Log every payment, then read the month. Private to your account.'}
      actions={
        <HideToggle />
      }
    >
      <div className="mb-3 flex gap-1" role="tablist" aria-label="Journal sections">
        {(['writing', 'spending'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-8 rounded-full border px-3.5 font-mono text-[12px] ${tab === t ? 'border-ink-2 bg-surface-2 text-ink' : 'border-line text-muted hover:text-ink'}`}>
            {t === 'writing' ? 'Thinking' : 'Spending'}
          </button>
        ))}
      </div>
      <Veil>
      {tab === 'spending' ? (
        <SpendingJournal hide={false} />
      ) : (
        <>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line font-mono sm:grid-cols-5" aria-label="Journal statistics">
        {(
          [
            ['entries', stats.entries],
            ['words', stats.words.toLocaleString()],
            ['streak', `${stats.streak}d`],
            ['best', `${stats.best}d`],
            ['avg words', stats.avg],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="bg-surface px-2.5 py-1.5">
            <dt className="text-[10px] tracking-wider text-muted uppercase">{k}</dt>
            <dd className="text-[15px] text-ink tabular">{v}</dd>
          </div>
        ))}
      </dl>

      {entries.length === 0 ? (
        <p className="mt-4 text-center text-sm text-muted">Nothing logged yet. Write under Thinking and observations and it shows up here.</p>
      ) : (
        <>
          <div className="mt-3">
            <Heatmap entries={entries} today={today} active={open} onPick={pick} />
            <p className="mt-1 font-mono text-[10px] text-muted">last {WEEKS} weeks · darker = more words</p>
          </div>

          {back && (
            <button type="button" onClick={() => pick(back.entry.date)} className="mt-3 block w-full rounded-xl border border-dashed border-line px-3.5 py-2.5 text-left hover:bg-surface-2">
              <span className="font-mono text-[10px] tracking-wider text-muted uppercase">// {back.label}</span>
              <span className={`mt-0.5 block truncate text-[13px] text-ink-2 ${hide ? 'blur-[5px] select-none' : ''}`}>{snippet(back.entry.thinking || back.entry.observations, '', 110)}</span>
            </button>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input aria-label="Search the journal" type="search" value={q} onChange={(e) => (setQ(e.target.value), setShown(15))} placeholder="grep your journal" className={`${inputClass} min-w-40 flex-1 font-mono`} />
            <div className="flex gap-1" role="group" aria-label="Filter by section">
              {(['all', 'thinking', 'observations'] as const).map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} className={chip(kind === k)} onClick={() => (setKind(k), setShown(15))}>
                  {k}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 font-mono text-[11px] text-muted" aria-live="polite">
            {list.length} of {entries.length} entries
          </p>

          <ul className="mt-2 grid gap-2" aria-label="Journal entries">
            {list.slice(0, shown).map((e) => (
              <EntryRow key={e.date} e={e} q={q} open={open === e.date} onToggle={() => setOpen(open === e.date ? null : e.date)} hide={hide && open !== e.date} onEdit={onEdit} />
            ))}
            {list.length === 0 && <li className="py-3 text-center text-sm text-muted">No entries match.</li>}
          </ul>
          {list.length > shown && (
            <div className="mt-3 text-center">
              <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + 15)}>
                Show {Math.min(15, list.length - shown)} more
              </Button>
            </div>
          )}
        </>
      )}
        </>
      )}
      </Veil>
    </Panel>
  )
}
