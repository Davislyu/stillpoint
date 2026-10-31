import { rowKey, TABLE_NAMES, type AnyRow, type Snapshot, type TableName, type TableStore } from './schema'


/**
 * A pending change. Ops are applied to local state immediately and queued in
 * the outbox until the server accepts them. All three kinds are idempotent,
 * so replaying an op after a dropped connection is always safe.
 *
 * - upsert: insert-or-merge. Natural-key tables send only the columns that
 *   changed (PostgREST updates just those), so concurrent edits to different
 *   fields of one row on two devices don't clobber each other.
 * - update: patch an existing row by id.
 * - delete: remove a row by id.
 */
export type Op =
  | { opId: string; table: TableName; kind: 'upsert'; key: string; row: AnyRow }
  | { opId: string; table: TableName; kind: 'update'; key: string; id: string; patch: AnyRow }
  | { opId: string; table: TableName; kind: 'delete'; key: string; id: string }
  /** Many inserts-or-merges in one request (e.g. a backlog of achievement unlocks). */
  | { opId: string; table: TableName; kind: 'bulkUpsert'; key: string; rows: AnyRow[] }

export type RemoteEvent = { table: TableName; type: 'upsert'; row: AnyRow } | { table: TableName; type: 'delete'; id: string }

export const opSlot = (op: Pick<Op, 'table' | 'key'>) => `${op.table}:${op.key}`

/** Every row slot an op touches. */
export function opSlots(op: Op): string[] {
  return op.kind === 'bulkUpsert' ? op.rows.map((r) => `${op.table}:${rowKey(op.table, r)}`) : [opSlot(op)]
}

type Mutable = Record<string, AnyRow>

/** Returns a new store with the op applied. Unchanged tables keep identity. */
export function applyOp(store: TableStore, op: Op): TableStore {
  const table = { ...(store[op.table] as Mutable) }
  const next = { ...store, [op.table]: table } as TableStore

  if (op.kind === 'upsert') {
    table[op.key] = { ...table[op.key], ...op.row }
  } else if (op.kind === 'bulkUpsert') {
    for (const row of op.rows) {
      const k = rowKey(op.table, row)
      table[k] = { ...table[k], ...row }
    }
  } else if (op.kind === 'update') {
    if (table[op.key]) table[op.key] = { ...table[op.key], ...op.patch }
  } else {
    delete table[op.key]
    // Mirror the database's ON DELETE CASCADE locally.
    if (op.table === 'habits') {
      const completions = { ...(store.habit_completions as Mutable) }
      for (const [k, c] of Object.entries(completions)) if (c.habit_id === op.id) delete completions[k]
      next.habit_completions = completions as TableStore['habit_completions']
    }
  }
  return next
}

/** Applies a change pushed from the server (another device, or our own echo). */
export function applyRemote(store: TableStore, ev: RemoteEvent): TableStore {
  if (ev.type === 'upsert') {
    const key = rowKey(ev.table, ev.row)
    const table = { ...(store[ev.table] as Mutable), [key]: { ...(store[ev.table] as Mutable)[key], ...ev.row } }
    return { ...store, [ev.table]: table } as TableStore
  }
  // Delete events carry only the primary key, so find the row by id.
  const rows = store[ev.table] as Mutable
  const key = Object.keys(rows).find((k) => rows[k].id === ev.id)
  return key ? applyOp(store, { opId: '', table: ev.table, kind: 'delete', key, id: ev.id }) : store
}

export function storeFromSnapshot(snap: Partial<Snapshot>): TableStore {
  const out = {} as Record<TableName, Mutable>
  for (const t of TABLE_NAMES) {
    out[t] = {}
    for (const row of (snap[t] ?? []) as AnyRow[]) out[t][rowKey(t, row)] = row
  }
  return out as TableStore
}

/**
 * Adds an op to the queue, folding it into the last queued op for the same row
 * when possible (e.g. each keystroke of an autosaving note).
 * `lockedOpId` is the op currently being sent; it is never modified.
 */
export function enqueue(outbox: Op[], op: Op, lockedOpId?: string): Op[] {
  const last = outbox[outbox.length - 1]
  if (last && last.opId !== lockedOpId && opSlot(last) === opSlot(op)) {
    if (last.kind === 'upsert' && op.kind === 'upsert') {
      return [...outbox.slice(0, -1), { ...last, row: { ...last.row, ...op.row } }]
    }
    if (last.kind === 'update' && op.kind === 'update') {
      return [...outbox.slice(0, -1), { ...last, patch: { ...last.patch, ...op.patch } }]
    }
    if (last.kind === 'upsert' && op.kind === 'update') {
      return [...outbox.slice(0, -1), { ...last, row: { ...last.row, ...op.patch } }]
    }
  }
  return [...outbox, op]
}
