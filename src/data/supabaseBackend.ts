import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { addDays } from '../lib/date'
import { ConfigError, type AuthUser, type Backend, type WriteResult } from './backend'
import type { Op } from './ops'
import { TABLE_NAMES, TABLES, usesNaturalKey, type AnyRow, type Snapshot, type TableName } from './schema'

/** How far back each table is loaded. Older rows stay in the database. */
const WINDOW_DAYS: Record<TableName, number | null> = {
  habits: null,
  milestones: null,
  // Two years of history: enough for streaks, lifetime XP and achievement progress.
  habit_completions: 730,
  daily_observations: 730,
  meals: 730,
  workouts: 7 * 104,
  non_essential_spendings: 730,
}
const DATE_COLUMN: Partial<Record<TableName, string>> = {
  habit_completions: 'date',
  daily_observations: 'date',
  meals: 'date',
  workouts: 'week_start_date',
  non_essential_spendings: 'date',
}

const toAuthUser = (u: User): AuthUser => ({
  id: u.id,
  email: u.email ?? '',
  name: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.name as string) ?? null,
  image: (u.user_metadata?.avatar_url as string) ?? (u.user_metadata?.picture as string) ?? null,
})

/** Network failures, timeouts, rate limits and server errors are worth retrying. */
const isRetryable = (status: number) => status === 0 || status === 401 || status === 408 || status === 429 || status >= 500

export function createSupabaseBackend(): Backend {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new ConfigError('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill it in.')
  }
  const sb: SupabaseClient = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  })

  const run = async (op: Op, userId: string) => {
    const t = sb.from(op.table)
    if (op.kind === 'upsert') {
      // Natural-key rows must not carry `id`, or a merge could rewrite the primary key.
      const row: AnyRow = { ...op.row, user_id: userId }
      if (usesNaturalKey(op.table)) delete row.id
      return t.upsert(row, { onConflict: TABLES[op.table].onConflict })
    }
    if (op.kind === 'bulkUpsert') {
      const rows = op.rows.map((r) => {
        const row: AnyRow = { ...r, user_id: userId }
        if (usesNaturalKey(op.table)) delete row.id
        return row
      })
      return t.upsert(rows, { onConflict: TABLES[op.table].onConflict })
    }
    if (op.kind === 'update') return t.update(op.patch).eq('id', op.id).eq('user_id', userId)
    return t.delete().eq('id', op.id).eq('user_id', userId)
  }

  return {
    kind: 'supabase',

    async getUser() {
      const { data } = await sb.auth.getSession()
      return data.session?.user ? toAuthUser(data.session.user) : null
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session?.user ? toAuthUser(session.user) : null))
      return () => data.subscription.unsubscribe()
    },

    async signInWithGoogle() {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/`, queryParams: { prompt: 'select_account' } },
      })
      if (error) throw error
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async fetchSnapshot(userId, today) {
      const queries = TABLE_NAMES.map(async (table) => {
        let q = sb.from(table).select(TABLES[table].columns).eq('user_id', userId)
        const days = WINDOW_DAYS[table]
        const col = DATE_COLUMN[table]
        if (days && col) q = q.gte(col, addDays(today, -days))
        if (table === 'habits') q = q.order('created_at', { ascending: true })
        const { data, error } = await q
        if (error) throw error
        return [table, data ?? []] as const
      })
      const profileQuery = async () => {
        const full = await sb.from('users').select('defaults_seeded, preferences').eq('id', userId).maybeSingle()
        // Before the preferences migration runs, fall back instead of failing the whole load.
        if (full.error?.code === '42703' || /preferences/.test(full.error?.message ?? '')) {
          const basic = await sb.from('users').select('defaults_seeded').eq('id', userId).maybeSingle()
          return { data: basic.data ? { ...basic.data, preferences: {} } : null, error: basic.error }
        }
        return full
      }
      const [results, profile] = await Promise.all([Promise.all(queries), profileQuery()])
      if (profile.error) throw profile.error
      const snapshot = Object.fromEntries(results) as unknown as Snapshot
      // Postgres numeric arrives as a number from PostgREST; normalise defensively.
      snapshot.non_essential_spendings = snapshot.non_essential_spendings.map((r) => ({ ...r, amount: Number(r.amount) }))
      return {
        snapshot,
        profile: { defaultsSeeded: !!profile.data?.defaults_seeded, preferences: profile.data?.preferences ?? {} },
      }
    },

    async write(op, userId): Promise<WriteResult> {
      try {
        const { error, status } = await run(op, userId)
        if (!error) return { ok: true }
        if (status === 401) await sb.auth.refreshSession()
        return { ok: false, retry: isRetryable(status), message: error.message }
      } catch (e) {
        return { ok: false, retry: true, message: e instanceof Error ? e.message : String(e) }
      }
    },

    async markDefaultsSeeded(userId) {
      await sb.from('users').update({ defaults_seeded: true }).eq('id', userId)
    },

    async savePreferences(userId, preferences) {
      await sb.from('users').update({ preferences }).eq('id', userId)
    },

    subscribe(userId, onEvent, onStatus) {
      const channel = sb.channel(`stillpoint:${userId}:${Math.random().toString(36).slice(2, 10)}`)
      for (const table of TABLE_NAMES) {
        // INSERT/UPDATE are filtered to this user (and RLS-checked by Realtime).
        channel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table, filter: `user_id=eq.${userId}` },
          (p) => onEvent({ table, type: 'upsert', row: p.new as Record<string, unknown> }),
        )
        channel.on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table, filter: `user_id=eq.${userId}` },
          (p) => onEvent({ table, type: 'upsert', row: p.new as Record<string, unknown> }),
        )
        // DELETE events can't be filtered and carry only the primary key; a
        // delete for an id we don't hold is simply ignored.
        channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (p) => {
          const id = (p.old as { id?: string }).id
          if (id) onEvent({ table, type: 'delete', id })
        })
      }
      channel.subscribe((status) => onStatus(status === 'SUBSCRIBED' ? 'live' : 'down'))
      return () => {
        void sb.removeChannel(channel)
      }
    },
  }
}
