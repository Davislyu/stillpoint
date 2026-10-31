import type { Note } from '../state/types'

/** [[Title]] or [[Title|shown text]] */
const LINK_RE = /\[\[([^[\]\n]{1,120}?)\]\]/g
/** #tag, #deep-work, #project/idea (works with any alphabet, including Hebrew) */
const TAG_RE = /(^|[\s(])#([\p{L}\p{N}_][\p{L}\p{N}_/-]{0,39})/gu

export const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
export const isDateTitle = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t.trim())
export const displayTitle = (n: Pick<Note, 'title'>) => n.title.trim() || 'Untitled'

export function parseLinks(body: string): string[] {
  const out = new Set<string>()
  for (const m of body.matchAll(LINK_RE)) {
    const target = norm(m[1].split('|')[0])
    if (target) out.add(target)
  }
  return [...out]
}

export function parseTags(body: string): string[] {
  const out = new Set<string>()
  for (const m of body.matchAll(TAG_RE)) out.add(m[2].toLowerCase())
  return [...out]
}

export interface GNode {
  id: string
  kind: 'note' | 'tag' | 'ghost'
  label: string
  /** Connections; drives node size. */
  degree: number
  noteId?: string
}
export interface GEdge {
  a: string
  b: string
  kind: 'link' | 'tag'
}
export interface Graph {
  nodes: GNode[]
  edges: GEdge[]
}

/** Oldest note with that title wins, so links stay stable if a title is ever duplicated. */
export function titleIndex(notes: Note[]): Map<string, Note> {
  const idx = new Map<string, Note>()
  for (const n of [...notes].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    const k = norm(n.title)
    if (k && !idx.has(k)) idx.set(k, n)
  }
  return idx
}

export function buildGraph(notes: Note[]): Graph {
  const idx = titleIndex(notes)
  const nodes = new Map<string, GNode>()
  const edges = new Map<string, GEdge>()
  const bump = (id: string) => void (nodes.get(id)!.degree += 1)
  const connect = (a: string, b: string, kind: GEdge['kind']) => {
    if (a === b) return
    const key = a < b ? `${a}|${b}` : `${b}|${a}`
    if (edges.has(key)) return
    edges.set(key, { a, b, kind })
    bump(a)
    bump(b)
  }
  for (const n of notes) nodes.set(`n:${n.id}`, { id: `n:${n.id}`, kind: 'note', label: displayTitle(n), degree: 0, noteId: n.id })
  for (const n of notes) {
    const from = `n:${n.id}`
    for (const target of parseLinks(n.body)) {
      const hit = idx.get(target)
      if (hit) connect(from, `n:${hit.id}`, 'link')
      else {
        const gid = `g:${target}`
        if (!nodes.has(gid)) nodes.set(gid, { id: gid, kind: 'ghost', label: target, degree: 0 })
        connect(from, gid, 'link')
      }
    }
    for (const tag of parseTags(n.body)) {
      const tid = `t:${tag}`
      if (!nodes.has(tid)) nodes.set(tid, { id: tid, kind: 'tag', label: `#${tag}`, degree: 0 })
      connect(from, tid, 'tag')
    }
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] }
}

/** Notes that link to this one. */
export function backlinks(notes: Note[], note: Note): Note[] {
  const k = norm(note.title)
  if (!k) return []
  const idx = titleIndex(notes)
  return notes.filter((o) => o.id !== note.id && parseLinks(o.body).some((t) => t === k && idx.get(t)?.id === note.id))
}

export function outgoing(notes: Note[], note: Note): { title: string; note: Note | null }[] {
  const idx = titleIndex(notes)
  return parseLinks(note.body).map((t) => ({ title: t, note: idx.get(t) ?? null })).filter((l) => l.note?.id !== note.id)
}

export function uniqueTitle(notes: Note[], base: string): string {
  const taken = new Set(notes.map((n) => norm(n.title)))
  const clean = base.trim() || 'Untitled'
  if (!taken.has(norm(clean))) return clean
  for (let i = 2; i < 500; i++) if (!taken.has(norm(`${clean} ${i}`))) return `${clean} ${i}`
  return `${clean} ${Date.now()}`
}

/** When a note is renamed, links to it in other notes follow. */
export function renameLinks(body: string, oldTitle: string, newTitle: string): string {
  const old = norm(oldTitle)
  if (!old) return body
  return body.replace(LINK_RE, (full, inner: string) => {
    const [target, ...alias] = inner.split('|')
    return norm(target) === old ? `[[${[newTitle.trim(), ...alias].join('|')}]]` : full
  })
}

export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)
export const excerpt = (body: string, n = 90) => body.replace(/\s+/g, ' ').trim().slice(0, n)
