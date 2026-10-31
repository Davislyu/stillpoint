import { todayKey } from '../lib/date'
import type { Backend, ChannelStatus, Profile } from './backend'
import { applyOp, applyRemote, enqueue, opSlot, opSlots, storeFromSnapshot, type Op, type RemoteEvent } from './ops'
import { emptyTables, rowKey, type TableStore } from './schema'

export type SyncStatus = 'loading' | 'synced' | 'saving' | 'offline'

export interface SyncState {
  tables: TableStore
  /** True once data is on screen, from cache or server. */
  ready: boolean
  /** Why loading failed, while nothing is on screen yet (no cache). */
  loadError: string | null
  status: SyncStatus
  pending: number
}

const cacheKey = (uid: string) => `stillpoint:cache:${uid}`
const outboxKey = (uid: string) => `stillpoint:outbox:${uid}`

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or private mode: sync still works, just without the offline cache */
  }
}

export interface SyncEngineOptions {
  backend: Backend
  userId: string
  /** Called when the server rejects a change for good (it has been rolled back). */
  onRejected?: (message: string) => void
  /** Runs once after the first successful server load. */
  onFirstLoad?: (engine: SyncEngine, profile: Profile) => void | Promise<void>
}

/**
 * Local-first sync:
 *   1. Paint instantly from the per-user cache.
 *   2. Load fresh rows from the server; replay any queued ops on top.
 *   3. Every change is applied locally at once and queued in a persisted
 *      outbox, then sent in order. Network failures back off and retry;
 *      a hard rejection drops the op and reloads from the server.
 *   4. Realtime pushes other devices' changes. While one of our own ops for
 *      the same row is still queued, the incoming change is ignored, since
 *      ours is newer.
 *   5. Reconnects, coming back online and refocusing the tab trigger a
 *      reload to pick up anything missed while away.
 */
export class SyncEngine {
  private state: SyncState
  private outbox: Op[]
  private listeners = new Set<() => void>()
  private sendingOpId: string | undefined
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private retryDelay = 1000
  private lastWriteAt = 0
  private lastFetchAt = 0
  private loadedOnce = false
  private channel: ChannelStatus = 'down'
  private everLive = false
  private teardown: (() => void)[] = []
  private stopped = false
  private cacheTimer: ReturnType<typeof setTimeout> | undefined

  constructor(private opts: SyncEngineOptions) {
    const cached = read<TableStore>(cacheKey(opts.userId))
    this.outbox = read<Op[]>(outboxKey(opts.userId)) ?? []
    let tables = { ...emptyTables(), ...(cached ?? {}) }
    for (const op of this.outbox) tables = applyOp(tables, op)
    this.state = { tables, ready: !!cached, loadError: null, status: 'loading', pending: this.outbox.length }
  }

  // ── public API ────────────────────────────────────────────────────────

  getState = () => this.state
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  /**
   * Safe to call again after stop(): React's development mode mounts,
   * unmounts and remounts every component once, which runs start → stop → start.
   */
  start() {
    this.stopped = false
    const { backend, userId } = this.opts
    this.teardown.push(
      backend.subscribe(
        userId,
        (ev) => this.onRemote(ev),
        (s) => {
          const wasDown = this.channel === 'down'
          this.channel = s
          // A reconnect may have missed events: reload to fill the gap.
          if (s === 'live' && wasDown && this.everLive) void this.refresh()
          if (s === 'live') this.everLive = true
          this.updateStatus()
        },
      ),
    )
    const online = () => {
      this.retryDelay = 1000
      void this.flush()
      void this.refresh()
    }
    const visible = () => {
      if (document.visibilityState === 'visible' && Date.now() - this.lastFetchAt > 15_000) void this.refresh()
    }
    const offline = () => this.updateStatus()
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('focus', visible)
    this.teardown.push(() => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('focus', visible)
    })
    void this.refresh()
    void this.flush()
  }

  stop() {
    this.stopped = true
    clearTimeout(this.retryTimer)
    clearTimeout(this.cacheTimer)
    this.teardown.forEach((fn) => fn())
    this.teardown = []
  }

  /** Apply ops locally right away and queue them for the server. */
  commit(ops: Op[]) {
    if (!ops.length) return
    let tables = this.state.tables
    for (const op of ops) {
      tables = applyOp(tables, op)
      this.outbox = enqueue(this.outbox, op, this.sendingOpId)
    }
    this.persistOutbox()
    this.set({ tables })
    this.scheduleCache()
    void this.flush()
  }

  /** Forget everything stored on this device for this user (used on sign-out). */
  static clearDevice(userId: string) {
    localStorage.removeItem(cacheKey(userId))
    localStorage.removeItem(outboxKey(userId))
  }

  // ── internals ─────────────────────────────────────────────────────────

  private set(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch, pending: this.outbox.length }
    this.listeners.forEach((l) => l())
  }

  private updateStatus() {
    let status: SyncStatus
    if (!this.loadedOnce && !this.state.ready) status = 'loading'
    else if (!navigator.onLine || (this.retryTimer && this.outbox.length)) status = 'offline'
    else if (this.outbox.length) status = 'saving'
    else status = this.loadedOnce ? 'synced' : 'loading'
    if (status !== this.state.status || this.state.pending !== this.outbox.length) this.set({ status })
  }

  private persistOutbox() {
    write(outboxKey(this.opts.userId), this.outbox)
  }

  private scheduleCache() {
    clearTimeout(this.cacheTimer)
    this.cacheTimer = setTimeout(() => write(cacheKey(this.opts.userId), this.state.tables), 400)
  }

  private onRemote(ev: RemoteEvent) {
    if (ev.type === 'upsert') {
      // Our queued change for this row is newer than what the server just sent.
      const slotKey = this.slotOfRemote(ev)
      if (this.outbox.some((op) => opSlots(op).includes(slotKey))) return
    }
    this.set({ tables: applyRemote(this.state.tables, ev) })
    this.scheduleCache()
  }

  private slotOfRemote(ev: Extract<RemoteEvent, { type: 'upsert' }>) {
    return opSlot({ table: ev.table, key: rowKey(ev.table, ev.row) })
  }

  private refreshing: Promise<void> | null = null
  async refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing
    this.refreshing = (async () => {
      const startedAt = Date.now()
      try {
        const { snapshot, profile } = await this.opts.backend.fetchSnapshot(this.opts.userId, todayKey())
        if (this.stopped) return
        let tables = storeFromSnapshot(snapshot)
        for (const op of this.outbox) tables = applyOp(tables, op)
        this.lastFetchAt = Date.now()
        const first = !this.loadedOnce
        this.loadedOnce = true
        this.set({ tables, ready: true, loadError: null })
        this.scheduleCache()
        this.updateStatus()
        if (first) await this.opts.onFirstLoad?.(this, profile)
        // A write landed while we were reading: read again so it isn't lost.
        if (this.lastWriteAt > startedAt) setTimeout(() => void this.refresh(), 50)
      } catch (e) {
        // Offline or server unavailable: keep showing cached data. With no
        // cache there's nothing to show, so say why instead of spinning.
        console.error('[stillpoint] loading data failed', e)
        if (!this.state.ready) this.set({ loadError: describeLoadError(e) })
        this.updateStatus()
      }
    })().finally(() => {
      this.refreshing = null
    })
    return this.refreshing
  }

  private flushing = false
  private async flush() {
    if (this.flushing || this.stopped) return
    this.flushing = true
    try {
      while (this.outbox.length && !this.stopped) {
        clearTimeout(this.retryTimer)
        this.retryTimer = undefined
        const op = this.outbox[0]
        this.sendingOpId = op.opId
        this.updateStatus()
        const res = await this.opts.backend.write(op, this.opts.userId)
        this.sendingOpId = undefined
        if (res.ok) {
          this.outbox = this.outbox.filter((o) => o.opId !== op.opId)
          this.lastWriteAt = Date.now()
          this.retryDelay = 1000
          this.persistOutbox()
          continue
        }
        if (res.retry) {
          this.retryTimer = setTimeout(() => void this.flush(), this.retryDelay)
          this.retryDelay = Math.min(this.retryDelay * 2, 30_000)
          break
        }
        // Rejected for good (e.g. a constraint): drop it and resync from the server.
        this.outbox = this.outbox.filter((o) => o.opId !== op.opId)
        this.persistOutbox()
        this.opts.onRejected?.(res.message)
        await this.refresh()
      }
    } finally {
      this.flushing = false
      this.sendingOpId = undefined
      this.set({})
      this.updateStatus()
    }
  }
}

/** Turns a failed first load into a sentence that says what to fix. */
export function describeLoadError(e: unknown): string {
  const err = e as { code?: string; message?: string } | null
  const msg = err?.message ?? String(e)
  if (err?.code === 'PGRST205' || err?.code === '42P01' || /could not find the table|does not exist/i.test(msg)) {
    return 'The database tables don\u2019t exist yet. Run supabase/migrations/20261031120000_stillpoint_v2.sql in the Supabase SQL Editor, then retry.'
  }
  if (err?.code === '42501' || /permission denied/i.test(msg)) {
    return 'The database refused access. Re-run the migration in the Supabase SQL Editor so its permissions are applied, then retry.'
  }
  if (/failed to fetch|network|load failed/i.test(msg)) {
    return 'Couldn\u2019t reach Supabase. Check your connection and the URL in .env.local, then retry.'
  }
  if (/invalid api key|jwt|apikey/i.test(msg)) {
    return 'Supabase rejected the API key. Check VITE_SUPABASE_ANON_KEY in .env.local (use the publishable key), restart npm run dev, then retry.'
  }
  return `Loading your data failed: ${msg}`
}
