import type { Op, RemoteEvent } from './ops'
import type { Snapshot, TableName } from './schema'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

export interface Profile {
  defaultsSeeded: boolean
  /** Theme and other per-account preferences (free-form JSON). */
  preferences: unknown
}

export type WriteResult = { ok: true } | { ok: false; retry: boolean; message: string }

export type ChannelStatus = 'live' | 'down'

/**
 * Everything the app needs from a server. Implemented by Supabase in
 * production and by an in-browser fake for end-to-end tests.
 * Every method that touches data takes the signed-in user's id and must
 * scope to it; the database enforces the same rule independently via RLS.
 */
export interface Backend {
  readonly kind: 'supabase' | 'memory'
  /** Optional tables the database doesn't have yet (its migration hasn't been run). */
  missingTables?(): TableName[]
  getUser(): Promise<AuthUser | null>
  onAuthChange(cb: (user: AuthUser | null) => void): () => void
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>

  fetchSnapshot(userId: string, today: string): Promise<{ snapshot: Snapshot; profile: Profile }>
  write(op: Op, userId: string): Promise<WriteResult>
  markDefaultsSeeded(userId: string): Promise<void>
  savePreferences(userId: string, preferences: object): Promise<void>
  subscribe(userId: string, onEvent: (ev: RemoteEvent) => void, onStatus: (s: ChannelStatus) => void): () => void
}

export class ConfigError extends Error {}

let backendPromise: Promise<Backend> | null = null

/**
 * One backend (and so one Supabase client) per page. Two clients would both
 * try to finish the OAuth redirect and contend for the same session lock;
 * React's development double-mount would otherwise create exactly that.
 */
export function createBackend(): Promise<Backend> {
  backendPromise ??= (async () => {
    // Statically replaced at build time, so the fake backend is tree-shaken out
    // of every build that doesn't set this flag.
    if (import.meta.env.VITE_E2E_MEMORY_BACKEND === 'true') {
      const { createMemoryBackend } = await import('./memoryBackend')
      return createMemoryBackend()
    }
    const { createSupabaseBackend } = await import('./supabaseBackend')
    return createSupabaseBackend()
  })()
  // A config error should be shown again on retry, not cached forever.
  backendPromise.catch(() => {
    backendPromise = null
  })
  return backendPromise
}
