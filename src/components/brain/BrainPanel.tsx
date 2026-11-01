import { useMemo, useState } from 'react'
import { buildGraph, displayTitle, excerpt, graphStats, isDateTitle, parseTags, uniqueTitle } from '../../brain/notes'
import { uid } from '../../lib/id'
import { longDate } from '../../lib/date'
import { useStore } from '../../state/store'
import { useHide } from '../../hooks/useHide'
import { Button } from '../ui/Button'
import { HideToggle } from '../ui/HideToggle'
import { Veil } from '../ui/Veil'
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
  const [hide] = useHide()
  const stats = useMemo(() => graphStats(buildGraph(notes)), [notes])
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
      hint="A knowledge graph of your notes. Connect ideas with [[Title]], group them with #topic."
      actions={
        <>
          <HideToggle />
          <Button size="sm" variant="primary" onClick={openToday}>
            <PlusIcon /> Today
          </Button>
        </>
      }
    >
      <Veil>
      {missing && (
        <p className="mb-3 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink-2" role="status">
          Notes need a one-time database update before they can be saved. Run the notes migration in Supabase, then reload.
        </p>
      )}
      <BrainGraph notes={notes} selectedId={selected} onSelect={setSelected} onTag={setTag} activeTag={tag} hideLabels={hide} />

      <dl className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line font-mono sm:grid-cols-6" aria-label="Graph statistics">
        {[
          ['nodes', stats.notes],
          ['links', stats.links],
          ['tags', stats.tags],
          ['clusters', stats.clusters],
          ['orphans', stats.orphans],
          ['density', `${(stats.density * 100).toFixed(0)}%`],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface px-2.5 py-1.5">
            <dt className="text-[10px] tracking-wider text-muted uppercase">{k}</dt>
            <dd className="text-[15px] text-ink tabular">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 font-mono text-[11px] text-muted">
        <span aria-hidden="true">● note &nbsp;□ tag &nbsp;◌ unwritten link</span>
        {stats.hub && <span> &nbsp;· hub: {stats.hub.label} ({stats.hub.degree})</span>}
        <span> &nbsp;· colour = cluster</span>
      </p>

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
          <NoteEditor key={current.id} hide={hide} note={current} notes={notes} onOpen={setSelected} onClose={() => setSelected(null)} />
        </div>
      )}

      {notes.length === 0 ? (
        <p className="mt-4 text-center text-sm text-muted">No nodes yet. Tap Today to create the first one.</p>
      ) : (
        <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto" aria-label="Notes">
          {shown.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => setSelected(n.id)} aria-current={n.id === selected ? 'true' : undefined} className={`block w-full px-1 py-2.5 text-left hover:bg-surface-2 ${n.id === selected ? 'bg-surface-2' : ''}`}>
                <span className="flex items-baseline justify-between gap-3">
                  <span className={`truncate text-sm font-medium text-ink ${hide ? 'blur-[5px] select-none' : ''}`}>{isDateTitle(n.title) ? longDate(n.title) : displayTitle(n)}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted tabular">{n.date}</span>
                </span>
                {n.body && <span className={`mt-0.5 block truncate font-mono text-[11px] text-muted ${hide ? 'blur-[5px] select-none' : ''}`}>{excerpt(n.body)}</span>}
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="py-4 text-center text-sm text-muted">No matches.</li>}
        </ul>
      )}
      </Veil>
    </Panel>
  )
}
