import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Minimal browser shims for the engine (no DOM library needed) ─────────
const store = new Map<string, string>()
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  window: new EventTarget(),
  document: Object.assign(new EventTarget(), { visibilityState: 'visible' }),
})
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })

const { SyncEngine } = await import('./syncEngine')
const { actionToOps } = await import('../state/actions')
const { emptyTables } = await import('./schema')
const { enqueue } = await import('./ops')
const { toAppState } = await import('../state/view')
import type { Backend, WriteResult } from './backend'
import type { Op, RemoteEvent } from './ops'
import type { Snapshot } from './schema'

const USER = 'u-1'
const emptySnap = (): Snapshot =>
  ({
    habits: [],
    habit_completions: [],
    milestones: [],
    daily_observations: [],
    meals: [],
    workouts: [],
    non_essential_spendings: [],
    notes: [],
    exercises: [],
  }) as Snapshot

/** Scriptable backend: a server-side row list, a switchable network, a realtime hook. */
function fakeBackend() {
  const server = emptySnap()
  let online = true
  let reject: string | null = null
  let push: (ev: RemoteEvent) => void = () => {}
  const writes: Op[] = []
  const backend: Backend = {
    kind: 'memory',
    getUser: async () => null,
    onAuthChange: () => () => {},
    signInWithGoogle: async () => {},
    signOut: async () => {},
    fetchSnapshot: async () => {
      if (!online) throw new Error('offline')
      return { snapshot: structuredClone(server), profile: { defaultsSeeded: true, preferences: {} } }
    },
    write: async (op): Promise<WriteResult> => {
      if (!online) return { ok: false, retry: true, message: 'Failed to fetch' }
      if (reject) return { ok: false, retry: false, message: reject }
      writes.push(op)
      const rows = server[op.table] as unknown as Record<string, unknown>[]
      if (op.kind === 'upsert') rows.push({ ...op.row, user_id: USER })
      return { ok: true }
    },
    markDefaultsSeeded: async () => {},
    savePreferences: async () => {},
    subscribe: (_u, onEvent, onStatus) => {
      push = onEvent
      onStatus('live')
      return () => {}
    },
  }
  return {
    backend,
    server,
    writes,
    setOnline: (v: boolean) => (online = v),
    setReject: (m: string | null) => (reject = m),
    push: (ev: RemoteEvent) => push(ev),
  }
}

const settle = () => new Promise((r) => setTimeout(r, 5))
const habitRow = (id: string, name = 'Gym', created_on = '2026-10-01') => ({
  id,
  user_id: USER,
  name,
  accent: 'sage' as const,
  created_on,
  archived_on: null,
})

beforeEach(() => {
  store.clear()
  vi.useRealTimers()
})

describe('actions (v1 reducer rules preserved)', () => {
  it('ticking a day before a habit existed back-fills its start date', () => {
    const t = emptyTables()
    t.habits.h1 = habitRow('h1', 'Gym', '2026-10-20')
    const ops = actionToOps({ type: 'habit/toggle', id: 'h1', date: '2026-10-18' }, t, USER)
    expect(ops.map((o) => o.kind)).toEqual(['update', 'upsert'])
    expect(ops[0]).toMatchObject({ kind: 'update', patch: { created_on: '2026-10-18' } })
  })

  it('removing a habit created today deletes it; an older one is archived', () => {
    const t = emptyTables()
    t.habits.new = habitRow('new', 'New', '2026-10-31')
    t.habits.old = habitRow('old', 'Old', '2026-10-01')
    expect(actionToOps({ type: 'habit/remove', id: 'new', today: '2026-10-31' }, t, USER)[0].kind).toBe('delete')
    expect(actionToOps({ type: 'habit/remove', id: 'old', today: '2026-10-31' }, t, USER)[0]).toMatchObject({
      kind: 'update',
      patch: { archived_on: '2026-10-31' },
    })
  })

  it('workout count is clamped to 0..4', () => {
    const [op] = actionToOps({ type: 'workout/set', weekStart: '2026-10-26', count: 9 }, emptyTables(), USER)
    expect(op).toMatchObject({ kind: 'upsert', row: { workout_count: 4 } })
  })

  it('spending amounts are stored from integer cents without float drift', () => {
    const [op] = actionToOps(
      { type: 'spending/add', date: '2026-10-31', amountCents: 1999, description: 'Book', category: 'impulse' },
      emptyTables(),
      USER,
    )
    expect(op.kind === 'upsert' && op.row.amount).toBe(19.99)
    const t = emptyTables()
    t.non_essential_spendings.x = { id: 'x', user_id: USER, date: '2026-10-31', amount: 0.1 + 0.2, description: 'a', category: 'other' }
    expect(toAppState(t).spendings[0].amountCents).toBe(30)
  })
})

describe('outbox', () => {
  it('folds rapid edits of the same row into one write', () => {
    const t = emptyTables()
    let box: Op[] = []
    for (const text of ['a', 'ab', 'abc']) {
      box = enqueue(box, actionToOps({ type: 'observation/set', date: '2026-10-31', field: 'observations', text }, t, USER)[0])
    }
    expect(box).toHaveLength(1)
    expect(box[0].kind === 'upsert' && box[0].row.observations_text).toBe('abc')
  })

  it('never folds into the op currently being sent', () => {
    const t = emptyTables()
    const a = actionToOps({ type: 'meal/note', date: '2026-10-31', meal: 1, notes: 'x' }, t, USER)[0]
    const b = actionToOps({ type: 'meal/note', date: '2026-10-31', meal: 1, notes: 'xy' }, t, USER)[0]
    expect(enqueue([a], b, a.opId)).toHaveLength(2)
  })
})

describe('SyncEngine', () => {
  it('applies changes instantly, queues them offline, and sends them when back online', async () => {
    const f = fakeBackend()
    f.setOnline(false)
    const engine = new SyncEngine({ backend: f.backend, userId: USER })
    engine.start()
    engine.commit(actionToOps({ type: 'meal/toggle', date: '2026-10-31', meal: 2 }, engine.getState().tables, USER))
    await settle()

    expect(engine.getState().tables.meals['2026-10-31|2'].is_completed).toBe(true) // optimistic
    expect(engine.getState().pending).toBe(1)
    expect(JSON.parse(store.get(`stillpoint:outbox:${USER}`)!)).toHaveLength(1) // survives reload

    f.setOnline(true)
    window.dispatchEvent(new Event('online'))
    await settle()
    expect(engine.getState().pending).toBe(0)
    expect(f.writes).toHaveLength(1)
    engine.stop()
  })

  it('restores a queued outbox after a reload and replays it over fresh server data', async () => {
    const f = fakeBackend()
    f.server.habits.push(habitRow('h1'))
    f.setOnline(false)
    const first = new SyncEngine({ backend: f.backend, userId: USER })
    first.start()
    await settle()
    first.commit([
      {
        opId: 'op1',
        table: 'non_essential_spendings',
        kind: 'upsert',
        key: 's1',
        row: { id: 's1', user_id: USER, date: '2026-10-31', amount: 4.5, description: 'Coffee', category: 'coffee' },
      },
    ])
    first.stop()

    // "Reload": a new engine on the same device, still offline at first.
    const second = new SyncEngine({ backend: f.backend, userId: USER })
    expect(second.getState().tables.non_essential_spendings.s1).toBeDefined()
    f.setOnline(true)
    second.start()
    await settle()
    const t = second.getState().tables
    expect(t.habits.h1).toBeDefined() // server data loaded
    expect(t.non_essential_spendings.s1.amount).toBe(4.5) // queued op replayed, then sent
    expect(second.getState().pending).toBe(0)
    second.stop()
  })

  it('ignores a remote echo for a row with a newer local edit still queued', async () => {
    const f = fakeBackend()
    f.setOnline(false)
    const engine = new SyncEngine({ backend: f.backend, userId: USER })
    engine.start()
    await settle()
    engine.commit(
      actionToOps({ type: 'observation/set', date: '2026-10-31', field: 'observations', text: 'newer' }, emptyTables(), USER),
    )
    f.push({
      table: 'daily_observations',
      type: 'upsert',
      row: { user_id: USER, date: '2026-10-31', observations_text: 'older', critical_thinking_text: '' },
    })
    expect(engine.getState().tables.daily_observations['2026-10-31'].observations_text).toBe('newer')

    // Other rows still update live.
    f.push({ table: 'workouts', type: 'upsert', row: { user_id: USER, week_start_date: '2026-10-26', workout_count: 3 } })
    expect(engine.getState().tables.workouts['2026-10-26'].workout_count).toBe(3)
    engine.stop()
  })

  it('applies another device’s delete by id', async () => {
    const f = fakeBackend()
    f.server.habits.push(habitRow('h1'))
    f.server.habit_completions.push({ id: 'c1', user_id: USER, habit_id: 'h1', date: '2026-10-30' })
    const engine = new SyncEngine({ backend: f.backend, userId: USER })
    engine.start()
    await settle()
    f.push({ table: 'habit_completions', type: 'delete', id: 'c1' })
    expect(engine.getState().tables.habit_completions).toEqual({})
    engine.stop()
  })

  it('rolls back a change the server rejects and reports it', async () => {
    const f = fakeBackend()
    const onRejected = vi.fn()
    const engine = new SyncEngine({ backend: f.backend, userId: USER, onRejected })
    engine.start()
    await settle()
    f.setReject('violates check constraint')
    engine.commit(actionToOps({ type: 'workout/set', weekStart: '2026-10-26', count: 2 }, emptyTables(), USER))
    await settle()
    expect(onRejected).toHaveBeenCalledWith('violates check constraint')
    expect(engine.getState().tables.workouts).toEqual({}) // reverted to server truth
    expect(engine.getState().pending).toBe(0)
    engine.stop()
  })

  it('keeps each account’s cache separate on a shared device', async () => {
    const a = fakeBackend()
    a.server.habits.push(habitRow('h-a', 'A habit'))
    const engineA = new SyncEngine({ backend: a.backend, userId: 'user-a' })
    engineA.start()
    await new Promise((r) => setTimeout(r, 450)) // cache write is debounced
    engineA.stop()
    expect(store.get('stillpoint:cache:user-a')).toContain('A habit')

    const engineB = new SyncEngine({ backend: fakeBackend().backend, userId: 'user-b' })
    expect(engineB.getState().tables.habits).toEqual({})
    SyncEngine.clearDevice('user-a')
    expect(store.has('stillpoint:cache:user-a')).toBe(false)
  })
})

describe('v1 import', async () => {
  const { legacyImportOps } = await import('./legacyImport')
  const { applyOp } = await import('./ops')
  const legacy = {
    version: 1 as const,
    habits: [
      { id: 'old-gym', name: 'gym', accent: 'clay', createdOn: '2026-10-10' },
      { id: 'old-read', name: 'Read', accent: 'not-a-colour', createdOn: '2026-10-12' },
    ],
    completions: { '2026-10-20': ['old-gym', 'old-read'], '2026-10-21': ['old-gym'] },
    milestones: { 'streak-3': '2026-10-22' },
  }

  it('maps habits by name, keeps history, and is safe to run twice', () => {
    let t = emptyTables()
    t.habits.h1 = habitRow('h1', 'Gym', '2026-10-31')
    const ops = legacyImportOps(legacy, t, USER)
    for (const op of ops) t = applyOp(t, op)
    const habits = Object.values(t.habits)
    expect(habits).toHaveLength(2) // "gym" matched existing "Gym"; "Read" created
    expect(t.habits.h1.created_on).toBe('2026-10-10') // start date moved back to cover history
    expect(habits.find((h) => h.name === 'Read')!.accent).toBe('sage') // invalid accent sanitised
    expect(Object.values(t.habit_completions)).toHaveLength(3)
    expect(t.milestones['streak-3'].reached_on).toBe('2026-10-22')
    expect(legacyImportOps(legacy, t, USER)).toHaveLength(0)
  })
})

describe('first-load failures', () => {
  it('shows a fix-it message instead of spinning forever when tables are missing', async () => {
    const f = fakeBackend()
    f.backend.fetchSnapshot = async () => {
      throw Object.assign(new Error("Could not find the table 'public.habits' in the schema cache"), { code: 'PGRST205' })
    }
    const engine = new SyncEngine({ backend: f.backend, userId: 'fresh-user' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    engine.start()
    await settle()
    expect(engine.getState().ready).toBe(false)
    expect(engine.getState().loadError).toMatch(/Run supabase\/migrations/)
    engine.stop()
  })
})

describe('React development double-mount', () => {
  it('loads data after start → stop → start', async () => {
    const f = fakeBackend()
    f.server.habits.push(habitRow('h1'))
    const engine = new SyncEngine({ backend: f.backend, userId: 'strict-user' })
    engine.start()
    engine.stop()
    engine.start()
    await settle()
    expect(engine.getState().ready).toBe(true)
    expect(engine.getState().tables.habits.h1).toBeDefined()
    engine.stop()
  })
})
