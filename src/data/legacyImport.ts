import { uid } from '../lib/id'
import type { LegacyState } from '../state/storage'
import { ACCENTS } from '../lib/accents'
import type { Op } from './ops'
import { rowKey, type TableStore } from './schema'

/**
 * Turns v1 local-only data into ops for the signed-in account.
 * Habits are matched by name (case-insensitive) so history lands on the
 * existing habit rather than creating a duplicate. Completions that already
 * exist are skipped, so importing twice is harmless.
 */
export function legacyImportOps(legacy: LegacyState, t: TableStore, userId: string): Op[] {
  const ops: Op[] = []
  const byName = new Map(Object.values(t.habits).map((h) => [h.name.trim().toLowerCase(), h]))
  const idMap = new Map<string, string>()
  const validAccent = (a: string) => (ACCENTS.some((x) => x.id === a) ? a : 'sage')

  for (const h of legacy.habits) {
    const existing = byName.get(h.name.trim().toLowerCase())
    if (existing) {
      idMap.set(h.id, existing.id)
      if (h.createdOn < existing.created_on) {
        ops.push({ opId: uid(), table: 'habits', kind: 'update', key: existing.id, id: existing.id, patch: { created_on: h.createdOn } })
      }
      continue
    }
    const id = uid()
    idMap.set(h.id, id)
    const row = {
      id,
      user_id: userId,
      name: h.name.trim().slice(0, 60),
      accent: validAccent(h.accent),
      created_on: h.createdOn,
      archived_on: h.archivedOn && h.archivedOn >= h.createdOn ? h.archivedOn : null,
    }
    ops.push({ opId: uid(), table: 'habits', kind: 'upsert', key: id, row })
  }

  const have = new Set(Object.values(t.habit_completions).map((c) => `${c.habit_id}|${c.date}`))
  for (const [date, ids] of Object.entries(legacy.completions)) {
    for (const oldId of ids) {
      const habitId = idMap.get(oldId)
      if (!habitId || have.has(`${habitId}|${date}`)) continue
      have.add(`${habitId}|${date}`)
      const row = { id: uid(), user_id: userId, habit_id: habitId, date }
      ops.push({ opId: uid(), table: 'habit_completions', kind: 'upsert', key: row.id, row })
    }
  }

  for (const [key, reached] of Object.entries(legacy.milestones ?? {})) {
    if (t.milestones[key]) continue
    const row = { user_id: userId, milestone_key: key, reached_on: reached }
    ops.push({ opId: uid(), table: 'milestones', kind: 'upsert', key: rowKey('milestones', row), row })
  }
  return ops
}
