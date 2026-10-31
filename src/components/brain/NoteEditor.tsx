import { useEffect, useRef, useState } from 'react'
import { backlinks, displayTitle, outgoing, parseTags, renameLinks, uniqueTitle, wordCount } from '../../brain/notes'
import { useAutosave } from '../../hooks/useAutosave'
import { longDate } from '../../lib/date'
import { useStore } from '../../state/store'
import type { Note } from '../../state/types'
import { Button } from '../ui/Button'
import { inputClass } from '../ui/Field'

/** Title + body for one note. [[ opens a picker of other notes. */
export function NoteEditor({ note, notes, onOpen, onClose }: { note: Note; notes: Note[]; onOpen: (id: string) => void; onClose: () => void }) {
  const { dispatch } = useStore()
  const area = useRef<HTMLTextAreaElement>(null)
  const [title, setTitle] = useState(note.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const body = useAutosave(note.body, (b) => dispatch({ type: 'note/edit', id: note.id, body: b }), 500)

  useEffect(() => setTitle(note.title), [note.id, note.title])
  useEffect(() => setConfirmDelete(false), [note.id])

  const commitTitle = () => {
    const clean = title.trim().slice(0, 120)
    if (!clean || clean === note.title) return setTitle(note.title)
    const others = notes.filter((n) => n.id !== note.id)
    const next = uniqueTitle(others, clean)
    setTitle(next)
    dispatch({ type: 'note/edit', id: note.id, title: next })
    // links elsewhere follow the new name
    for (const o of others) {
      const rewritten = renameLinks(o.body, note.title, next)
      if (rewritten !== o.body) dispatch({ type: 'note/edit', id: o.id, body: rewritten })
    }
  }

  // [[ autocomplete: the open "[[query" before the caret
  const [caret, setCaret] = useState(0)
  const m = /\[\[([^\]\n]{0,60})$/.exec(body.draft.slice(0, caret))
  const query = m?.[1].toLowerCase() ?? null
  const picks = query === null ? [] : notes.filter((n) => n.id !== note.id && n.title.toLowerCase().includes(query)).slice(0, 5)
  const insert = (t: string) => {
    if (!m) return
    const start = caret - m[0].length
    const after = body.draft.slice(caret).replace(/^\]\]/, '')
    const next = `${body.draft.slice(0, start)}[[${t}]]${after}`
    body.setDraft(next)
    const pos = start + t.length + 4
    requestAnimationFrame(() => {
      area.current?.focus()
      area.current?.setSelectionRange(pos, pos)
      setCaret(pos)
    })
  }

  const live: Note = { ...note, title: note.title, body: body.draft }
  const out = outgoing(notes, live)
  const back = backlinks(notes, note)
  const tags = parseTags(body.draft)
  const chip = 'max-w-full truncate rounded-full border border-line px-2.5 py-1 text-[12px] hover:bg-surface-2'

  return (
    <div className="rounded-xl border border-line bg-bg p-4" data-testid="note-editor">
      <div className="flex items-start gap-2">
        <input
          aria-label="Note title"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), area.current?.focus())}
          className="min-w-0 flex-1 bg-transparent font-display text-lg font-medium text-ink placeholder:text-muted focus:outline-none"
          placeholder="Title"
        />
        <Button size="sm" variant="ghost" onClick={() => (body.flush(), onClose())}>
          Close
        </Button>
      </div>
      <p className="mt-0.5 text-[12px] text-muted">
        {longDate(note.date)} · {wordCount(body.draft)} words
      </p>
      <div className="relative mt-3">
        <textarea
          ref={area}
          aria-label="Note body"
          value={body.draft}
          maxLength={20000}
          rows={9}
          onChange={(e) => (body.setDraft(e.target.value), setCaret(e.target.selectionStart))}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
          {...body.bind}
          placeholder="Write freely. Link ideas with [[Another note]], group them with #tags."
          className={`${inputClass} h-auto min-h-40 resize-y py-2.5 leading-relaxed`}
        />
        {picks.length > 0 && (
          <ul className="absolute right-2 bottom-2 left-2 z-10 overflow-hidden rounded-xl border border-line-strong bg-bg shadow-lg" role="listbox" aria-label="Link to a note">
            {picks.map((p) => (
              <li key={p.id}>
                <button type="button" role="option" aria-selected="false" className="block w-full truncate px-3 py-2 text-left text-sm text-ink hover:bg-surface-2" onMouseDown={(e) => (e.preventDefault(), insert(displayTitle(p)))}>
                  {displayTitle(p)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(out.length > 0 || tags.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Links and tags">
          {out.map((l) =>
            l.note ? (
              <button key={l.title} type="button" className={`${chip} text-ink`} onClick={() => (body.flush(), onOpen(l.note!.id))}>
                → {displayTitle(l.note)}
              </button>
            ) : (
              <span key={l.title} className={`${chip} border-dashed text-muted`} title="No note with this title yet">
                {l.title}
              </span>
            ),
          )}
          {tags.map((t) => (
            <span key={t} className={`${chip} text-ink-2`}>
              #{t}
            </span>
          ))}
        </div>
      )}
      {back.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] text-muted">Linked from</p>
          <div className="flex flex-wrap gap-1.5">
            {back.map((b) => (
              <button key={b.id} type="button" className={`${chip} text-ink`} onClick={() => (body.flush(), onOpen(b.id))}>
                ← {displayTitle(b)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        {confirmDelete ? (
          <span className="flex items-center gap-2 text-[13px] text-muted">
            Delete this note?
            <Button size="sm" variant="secondary" onClick={() => (dispatch({ type: 'note/remove', id: note.id }), onClose())}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete note
          </Button>
        )}
      </div>
    </div>
  )
}
