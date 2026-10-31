/**
 * In-browser stand-in for Supabase, used only by end-to-end tests
 * (VITE_E2E_MEMORY_BACKEND=true). Tabs of the same browser share one
 * "database" in localStorage and receive each other's changes over a
 * BroadcastChannel, which mimics two devices on Supabase Realtime.
 * Setting localStorage['e2e:offline'] = '1' simulates losing the network.
 * Never included in production builds.
 */
import type { AuthUser, Backend, WriteResult } from './backend'
import type { RemoteEvent } from './ops'
import { rowKey, TABLE_NAMES, usesNaturalKey, type AnyRow, type Snapshot, type TableName } from './schema'

const DB_KEY = 'e2e:db'
const SESSION_KEY = 'e2e:session'
const TEST_USER: AuthUser = { id: '00000000-0000-4000-8000-0000000000e2', email: 'sam@example.com', name: 'Sam Rivera', image: null }

type Db = { tables: Record<TableName, AnyRow[]>; profile: { defaultsSeeded: boolean; preferences: unknown } }

const load = (): Db => {
  try {
    const db = JSON.parse(localStorage.getItem(DB_KEY) ?? 'null')
    if (db) return db
  } catch {
    /* fall through */
  }
  return { tables: Object.fromEntries(TABLE_NAMES.map((t) => [t, []])) as unknown as Db['tables'], profile: { defaultsSeeded: false, preferences: {} } }
}
const save = (db: Db) => localStorage.setItem(DB_KEY, JSON.stringify(db))
const offline = () => localStorage.getItem('e2e:offline') === '1'
const delay = () => new Promise((r) => setTimeout(r, 40))

export function createMemoryBackend(): Backend {
  const bus = new BroadcastChannel('e2e:realtime')
  const authListeners = new Set<(u: AuthUser | null) => void>()
  const session = () => (localStorage.getItem(SESSION_KEY) ? TEST_USER : null)

  return {
    kind: 'memory',
    async getUser() {
      return session()
    },
    onAuthChange(cb) {
      authListeners.add(cb)
      return () => authListeners.delete(cb)
    },
    async signInWithGoogle() {
      localStorage.setItem(SESSION_KEY, '1')
      authListeners.forEach((l) => l(TEST_USER))
    },
    async signOut() {
      localStorage.removeItem(SESSION_KEY)
      authListeners.forEach((l) => l(null))
    },

    async fetchSnapshot(userId) {
      await delay()
      if (offline()) throw new Error('Failed to fetch')
      const db = load()
      const snapshot = Object.fromEntries(
        TABLE_NAMES.map((t) => [t, db.tables[t].filter((r) => r.user_id === userId)]),
      ) as unknown as Snapshot
      return { snapshot, profile: db.profile }
    },

    async write(op, userId): Promise<WriteResult> {
      await delay()
      if (offline()) return { ok: false, retry: true, message: 'Failed to fetch' }
      const db = load()
      const rows = db.tables[op.table]
      const find = (pred: (r: AnyRow) => boolean) => rows.findIndex((r) => r.user_id === userId && pred(r))
      let event: RemoteEvent

      if (op.kind === 'bulkUpsert') {
        for (const r of op.rows) {
          const row: AnyRow = { ...r, user_id: userId }
          const i = find((x) => rowKey(op.table, x) === rowKey(op.table, row))
          if (i >= 0) rows[i] = { ...rows[i], ...row }
          else rows.push({ id: crypto.randomUUID(), ...row })
          bus.postMessage({ table: op.table, type: 'upsert', row: rows[i >= 0 ? i : rows.length - 1] })
        }
        save(db)
        return { ok: true }
      }
      if (op.kind === 'upsert') {
        const row: AnyRow = { ...op.row, user_id: userId }
        const key = rowKey(op.table, row)
        const i = find((r) => rowKey(op.table, r) === key)
        if (op.table === 'habit_completions' && i < 0 && find((r) => r.habit_id === row.habit_id && r.date === row.date) >= 0) {
          return { ok: false, retry: false, message: 'duplicate key value violates unique constraint "habit_completions_once_per_day"' }
        }
        if (i >= 0) rows[i] = { ...rows[i], ...row }
        else rows.push(usesNaturalKey(op.table) ? { id: crypto.randomUUID(), ...row } : row)
        event = { table: op.table, type: 'upsert', row: rows[i >= 0 ? i : rows.length - 1] }
      } else if (op.kind === 'update') {
        const i = find((r) => r.id === op.id)
        if (i < 0) return { ok: true }
        rows[i] = { ...rows[i], ...op.patch }
        event = { table: op.table, type: 'upsert', row: rows[i] }
      } else {
        const i = find((r) => r.id === op.id)
        if (i < 0) return { ok: true }
        rows.splice(i, 1)
        if (op.table === 'habits') {
          db.tables.habit_completions = db.tables.habit_completions.filter((c) => c.habit_id !== op.id)
        }
        event = { table: op.table, type: 'delete', id: op.id }
      }
      save(db)
      bus.postMessage(event)
      return { ok: true }
    },

    async savePreferences(_userId, preferences) {
      const db = load()
      db.profile.preferences = preferences
      save(db)
    },

    async markDefaultsSeeded() {
      const db = load()
      db.profile.defaultsSeeded = true
      save(db)
    },

    subscribe(_userId, onEvent, onStatus) {
      const handler = (e: MessageEvent<RemoteEvent>) => onEvent(e.data)
      bus.addEventListener('message', handler)
      setTimeout(() => onStatus('live'), 0)
      return () => bus.removeEventListener('message', handler)
    },
  }
}
