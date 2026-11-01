import { addDays } from '../lib/date'
import type { DateKey, Observation } from '../state/types'

export interface Entry {
  date: DateKey
  /** 1 = the first day you ever wrote. */
  no: number
  thinking: string
  observations: string
  words: number
}

export const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)
/** About 220 words a minute. */
export const readMinutes = (words: number) => Math.max(1, Math.round(words / 220))

/** Every day with something written, newest first. */
export function buildEntries(obs: Record<DateKey, Observation>): Entry[] {
  const days = Object.keys(obs)
    .filter((d) => (obs[d].criticalThinking ?? '').trim() || (obs[d].observations ?? '').trim())
    .sort()
  return days
    .map((date, i): Entry => {
      const o = obs[date]
      return { date, no: i + 1, thinking: o.criticalThinking.trim(), observations: o.observations.trim(), words: countWords(o.criticalThinking) + countWords(o.observations) }
    })
    .reverse()
}

export type Kind = 'all' | 'thinking' | 'observations'

export function filterEntries(entries: Entry[], query: string, kind: Kind): Entry[] {
  const q = query.trim().toLowerCase()
  return entries.filter((e) => {
    if (kind === 'thinking' && !e.thinking) return false
    if (kind === 'observations' && !e.observations) return false
    if (!q) return true
    const hay = kind === 'thinking' ? e.thinking : kind === 'observations' ? e.observations : `${e.thinking}\n${e.observations}`
    return hay.toLowerCase().includes(q) || e.date.includes(q)
  })
}

/** Text around the first match so the hit is visible in a short preview. */
export function snippet(text: string, query: string, len = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const q = query.trim().toLowerCase()
  const at = q ? flat.toLowerCase().indexOf(q) : -1
  if (at < 0 || flat.length <= len) return flat.length > len ? flat.slice(0, len - 1) + '…' : flat
  const start = Math.max(0, at - 40)
  return (start ? '…' : '') + flat.slice(start, start + len - 1) + (start + len < flat.length ? '…' : '')
}

export interface JournalStats {
  entries: number
  words: number
  streak: number
  best: number
  avg: number
}

export function journalStats(entries: Entry[], today: DateKey): JournalStats {
  const days = new Set(entries.map((e) => e.date))
  // current run, allowing today to still be empty
  let streak = 0
  let d = days.has(today) ? today : addDays(today, -1)
  while (days.has(d)) (streak++, (d = addDays(d, -1)))
  let best = 0
  let run = 0
  let prev: DateKey | null = null
  for (const e of [...entries].reverse()) {
    run = prev && addDays(prev, 1) === e.date ? run + 1 : 1
    best = Math.max(best, run)
    prev = e.date
  }
  const words = entries.reduce((a, e) => a + e.words, 0)
  return { entries: entries.length, words, streak, best, avg: entries.length ? Math.round(words / entries.length) : 0 }
}

/** 0 = nothing written, 1 to 4 by length. */
export const level = (words: number) => (words <= 0 ? 0 : words < 40 ? 1 : words < 120 ? 2 : words < 300 ? 3 : 4)

/** Earlier entries written on this calendar day or about a week, month and year ago. */
export function flashback(entries: Entry[], today: DateKey): { label: string; entry: Entry } | null {
  const by = new Map(entries.map((e) => [e.date, e]))
  for (const [n, label] of [[7, 'A week ago'], [30, '30 days ago'], [365, 'A year ago']] as const) {
    const e = by.get(addDays(today, -n))
    if (e) return { label, entry: e }
  }
  return null
}
