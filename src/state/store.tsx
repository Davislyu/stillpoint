import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { AuthUser, Backend } from '../data/backend'
import { SyncEngine, type SyncStatus } from '../data/syncEngine'
import { todayKey } from '../lib/date'
import { useNow } from '../hooks/useNow'
import { actionToOps, defaultHabitOps, type Action } from './actions'
import { normalizePrefs, useThemeCtx } from '../themes/vibe'
import type { AppState, DateKey } from './types'
import { toAppState } from './view'

interface Store {
  state: AppState
  dispatch: (action: Action) => void
  /** Current local day; updates on its own at midnight. */
  today: DateKey
  user: AuthUser
  sync: { status: SyncStatus; pending: number; ready: boolean; loadError: string | null }
  engine: SyncEngine
}

const StoreContext = createContext<Store | null>(null)

interface Props {
  backend: Backend
  user: AuthUser
  onRejected: (message: string) => void
  children: ReactNode
}

/**
 * Per-user data store. Mounted only for a signed-in user (see AuthGate) and
 * keyed by user id, so switching accounts always starts from a clean slate.
 */
export function StoreProvider({ backend, user, onRejected, children }: Props) {
  const themeCtx = useThemeCtx()
  const adoptRef = useRef(themeCtx.adopt)
  adoptRef.current = themeCtx.adopt
  const [engine] = useState(
    () =>
      new SyncEngine({
        backend,
        userId: user.id,
        onRejected,
        onFirstLoad: async (eng, profile) => {
          adoptRef.current?.(normalizePrefs(profile.preferences))
          if (profile.defaultsSeeded) return
          if (Object.keys(eng.getState().tables.habits).length === 0) {
            eng.commit(await defaultHabitOps(user.id, todayKey()))
          }
          await backend.markDefaultsSeeded(user.id).catch(() => {})
        },
      }),
  )
  useEffect(() => {
    engine.start()
    return () => engine.stop()
  }, [engine])

  const sync = useSyncExternalStore(engine.subscribe, engine.getState)
  const now = useNow(30_000)
  const today = todayKey(new Date(now))

  const state = useMemo(() => toAppState(sync.tables), [sync.tables])

  // Theme choice follows the account across devices.
  const theme = useThemeCtx()
  useEffect(() => {
    theme.setPersist((p) => void backend.savePreferences(user.id, p).catch(() => {}))
    return () => theme.setPersist(null)
  }, [backend, user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const dispatch = useCallback(
    (action: Action) => {
      engine.commit(actionToOps(action, engine.getState().tables, user.id))
    },
    [engine, user.id],
  )

  const value = useMemo<Store>(
    () => ({
      state,
      dispatch,
      today,
      user,
      engine,
      sync: { status: sync.status, pending: sync.pending, ready: sync.ready, loadError: sync.loadError },
    }),
    [state, dispatch, today, user, engine, sync.status, sync.pending, sync.ready, sync.loadError],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
