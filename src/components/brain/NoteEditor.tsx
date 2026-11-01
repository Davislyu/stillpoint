import { useEffect, useRef, useState } from 'react'
import { backlinks, displayTitle, norm, outgoing, parseTags, renameLinks, uniqueTitle, wordCount } from '../../brain/notes'
import { uid } from '../../lib/id'
import { useAutosave } from '../../hooks/useAutosave'
import { longDate } from '../../lib/date'
import { useStore } from '../../state/store'
import type { Note } from '../../state/types'
import { Button } from '../ui/Button'
import { inputClass } from '../ui/Field'

/** Title + body for one note. [[ opens a picker of other notes. */
export function NoteEditor({ note, notes, onOpen, onClose, hide = false }: { note: Note; notes: Note[]; onOpen: (id: string) => void; onClose: () => void; hide?: boolean }) {
  const { dispatch, today } = useStore()
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

  const tags = parseTags(body.draft)
  // Simple linking: pick a note (or type a new title) instead of typing [[ ]] by hand.
  const [linking, setLinking] = useState(false)
  const [find, setFind] = useState('')
  const insertAtCaret = (text: string) => {
    const el = area.current
    const at = el ? el.selectionStart : body.draft.length
    const end = el ? el.selectionEnd : at
    const before = body.draft.slice(0, at)
    const lead = before && !/\s$/.test(before) ? ' ' : ''
    const next = `${before}${lead}${text} ${body.draft.slice(end)}`.replace(/ $/, '')
    body.setDraft(next)
    setFind('')
    setLinking(false)
  }
  const needle = find.trim().replace(/^#/, '').toLowerCase()
  const isTagQuery = find.trim().startsWith('#')
  const candidates = notes.filter((n) => n.id !== note.id && (!needle || displayTitle(n).toLowerCase().includes(needle))).slice(0, 6)
  const exact = notes.some((n) => norm(n.title) === norm(find))
  const knownTags = [...new Set(notes.flatMap((n) => parseTags(n.body)))].filter((t) => !tags.includes(t)).slice(0, 8)
  const linkTo = (title: string) => insertAtCaret(`[[${title}]]`)
  const createAndLink = () => {
    const title = uniqueTitle(notes, find.trim().slice(0, 120))
    dispatch({ type: 'note/create', id: uid(), date: today, title, body: '' })
    linkTo(title)
  }

  const live: Note = { ...note, title: note.title, body: body.draft }
  const out = outgoing(notes, live)
  const back = backlinks(notes, note)
  const chip = 'max-w-full truncate rounded-full border border-line px-2.5 py-1 text-[12px] hover:bg-surface-2'

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4" data-testid="note-editor">
      <div className="flex items-start gap-2">
        <input
          aria-label="Note title"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), area.current?.focus())}
          className={`min-w-0 flex-1 bg-transparent font-display text-lg font-medium text-ink placeholder:text-muted focus:outline-none ${hide ? 'blur-[5px] focus:blur-none' : ''}`}
          placeholder="Title"
        />
        <Button size="sm" variant="ghost" onClick={() => (body.flush(), onClose())}>
          Close
        </Button>
      </div>
      <p className="mt-0.5 text-[12px] text-muted">
        {longDate(note.date)} · {wordCount(body.draft)} words
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="secondary" aria-expanded={linking} onClick={() => setLinking((v) => !v)}>
          {linking ? 'Cancel' : '+ Link a note'}
        </Button>
        <span className="text-[12px] text-muted">Connect this thought to another, or tag it.</span>
      </div>
      {linking && (
        <div className="mt-2 rounded-xl border border-line-strong bg-surface p-3" role="group" aria-label="Link a note">
          <input autoFocus aria-label="Search notes to link" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a note, type a new title, or #tag" className={inputClass} />
          {isTagQuery ? (
            needle && (
              <button type="button" className="mt-2 block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface-2" onClick={() => insertAtCaret(`#${needle.replace(/[^\p{L}\p{N}_/-]/gu, '-')}`)}>
                Tag with #{needle}
              </button>
            )
          ) : (
            <ul className="mt-2 grid gap-0.5" aria-label="Notes">
              {candidates.map((n) => (
                <li key={n.id}>
                  <button type="button" className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface-2" onClick={() => linkTo(displayTitle(n))}>
                    {displayTitle(n)}
                  </button>
                </li>
              ))}
              {find.trim() && !exact && (
                <li>
                  <button type="button" className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface-2" onClick={createAndLink}>
                    + Create “{find.trim()}” and link it
                  </button>
                </li>
              )}
              {candidates.length === 0 && !find.trim() && <li className="px-3 py-2 text-sm text-muted">No other notes yet. Type a title to create one.</li>}
            </ul>
          )}
          {knownTags.length > 0 && !find.trim() && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Existing tags">
              {knownTags.map((t) => (
                <button key={t} type="button" className="rounded-full border border-line px-2.5 py-1 font-mono text-[12px] text-ink-2 hover:bg-surface-2" onClick={() => insertAtCaret(`#${t}`)}>
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className={`relative mt-3 ${hide ? '[&:not(:focus-within)]:blur-[5px]' : ''}`}>
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
          className={`${inputClass} h-auto min-h-40 resize-y py-2.5 font-mono text-[13px] leading-relaxed`}
        />
        {picks.length > 0 && (
          <ul className="absolute right-2 bottom-2 left-2 z-10 overflow-hidden rounded-xl border border-line-strong bg-float shadow-lg" role="listbox" aria-label="Link to a note">
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
