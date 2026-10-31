import { useMemo, useState } from 'react'
import { displayTitle, excerpt, isDateTitle, parseTags, uniqueTitle } from '../../brain/notes'
import { uid } from '../../lib/id'
import { longDate } from '../../lib/date'
import { useStore } from '../../state/store'
import { Button } from '../ui/Button'
import { inputClass } from '../ui/Field'
import { PlusIcon } from '../ui/Icons'
import { Panel } from '../ui/Panel'
import { BrainGraph } from './BrainGraph'
import { NoteEditor } from './NoteEditor'

/** Second brain: notes as a glowing network inside a brain. */
export function BrainPanel() {
  const { state, dispatch, today, backend } = useStore()
  const notes = state.notes
  const [selected, setSelected] = useState<string | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const missing = backend.missingTables?.().includes('notes') ?? false
  const current = notes.find((n) => n.id === selected) ?? null

  const create = (title: string, body = '') => {
    const id = uid()
    dispatch({ type: 'note/create', id, date: today, title: uniqueTitle(notes, title), body })
    setSelected(id)
  }
  const openToday = () => {
    const existing = notes.find((n) => n.title === today)
    if (existing) setSelected(existing.id)
    else create(today)
  }

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return notes.filter((n) => (!needle || `${n.title} ${n.body}`.toLowerCase().includes(needle)) && (!tag || parseTags(n.body).includes(tag)))
  }, [notes, q, tag])

  return (
    <Panel
      id="brain"
      title="Second brain"
      hint={notes.length ? `${notes.length} ${notes.length === 1 ? 'thought' : 'thoughts'}. Link them with [[double brackets]].` : 'Write down what you think. Link ideas and watch them grow into a mind.'}
      actions={
        <Button size="sm" variant="primary" onClick={openToday}>
          <PlusIcon /> Today
        </Button>
      }
    >
      {missing && (
        <p className="mb-3 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink-2" role="status">
          Notes need a one-time database update before they can be saved. Run the notes migration in Supabase, then reload.
        </p>
      )}
      <BrainGraph notes={notes} selectedId={selected} onSelect={setSelected} onTag={setTag} activeTag={tag} />

      <div className="mt-3 flex items-center gap-2">
        <input aria-label="Search notes" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your mind" className={`${inputClass} flex-1`} />
        <Button variant="secondary" onClick={() => create('New thought')}>
          New note
        </Button>
      </div>
      {tag && (
        <p className="mt-2 text-[12px] text-muted">
          Showing #{tag}{' '}
          <button type="button" className="underline hover:text-ink" onClick={() => setTag(null)}>
            clear
          </button>
        </p>
      )}

      {current && (
        <div className="mt-3">
          <NoteEditor key={current.id} note={current} notes={notes} onOpen={setSelected} onClose={() => setSelected(null)} />
        </div>
      )}

      {notes.length === 0 ? (
        <p className="mt-4 text-center text-sm text-muted">Nothing yet. Tap Today to start with a daily note.</p>
      ) : (
        <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto" aria-label="Notes">
          {shown.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => setSelected(n.id)} aria-current={n.id === selected ? 'true' : undefined} className={`block w-full px-1 py-2.5 text-left hover:bg-surface-2 ${n.id === selected ? 'bg-surface-2' : ''}`}>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-ink">{isDateTitle(n.title) ? longDate(n.title) : displayTitle(n)}</span>
                  <span className="shrink-0 text-[11px] text-muted tabular">{n.date}</span>
                </span>
                {n.body && <span className="mt-0.5 block truncate text-[12px] text-muted">{excerpt(n.body)}</span>}
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="py-4 text-center text-sm text-muted">No matches.</li>}
        </ul>
      )}
    </Panel>
  )
}
