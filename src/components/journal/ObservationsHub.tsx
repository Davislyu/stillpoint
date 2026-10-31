import { useEffect, useRef } from 'react'
import { useAutosave } from '../../hooks/useAutosave'
import { useStore } from '../../state/store'
import type { DateKey } from '../../state/types'
import { PastDayNote } from '../ui/DayContext'
import { Panel } from '../ui/Panel'

type Field = 'criticalThinking' | 'observations'

function NoteBlock({ date, field, title, placeholder }: { date: DateKey; field: Field; title: string; placeholder: string }) {
  const { state, dispatch, sync } = useStore()
  const stored = state.observations[date]?.[field] ?? ''
  const { draft, setDraft, pending, bind } = useAutosave(stored, (text) =>
    dispatch({ type: 'observation/set', date, field, text }),
  )
  const ref = useRef<HTMLTextAreaElement>(null)
  const id = `note-${field}`

  // Grow with content; no inner scrollbars.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`
  }, [draft])

  const status = pending ? 'Saving…' : sync.pending ? 'Syncing…' : draft ? 'Saved' : ''

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-display text-[15px] font-medium tracking-[-0.01em] text-ink">
          {title}
        </label>
        <span aria-live="polite" className="text-[12px] text-muted">
          {status}
        </span>
      </div>
      <textarea
        id={id}
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        {...bind}
        maxLength={20000}
        placeholder={placeholder}
        spellCheck
        className="block min-h-[120px] w-full resize-none rounded-xl border border-line bg-bg px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-muted/80 focus:border-line-strong focus:outline-none"
      />
    </div>
  )
}

export function ObservationsHub({ date, onBackToToday }: { date: DateKey; onBackToToday: () => void }) {
  const { today } = useStore()
  return (
    <Panel
      id="notes"
      title="Thinking and observations"
      hint={date === today ? 'Saves as you type.' : <PastDayNote date={date} today={today} onBackToToday={onBackToToday} />}
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <NoteBlock
          key={`ct-${date}`}
          date={date}
          field="criticalThinking"
          title="Extra Critical Thinking"
          placeholder="A design trade-off you weighed, an assumption you questioned, why a fix worked…"
        />
        <NoteBlock
          key={`ob-${date}`}
          date={date}
          field="observations"
          title="Daily Observations"
          placeholder="What you noticed today, about the work or about yourself."
        />
      </div>
    </Panel>
  )
}
