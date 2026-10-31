import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '../components/ui/Toast'
import { useStore } from '../state/store'
import { useThemeCtx } from '../themes/vibe'
import type { Achievement } from './achievements'
import type { Monster } from './bestiary'
import type { Item } from './loot'
import { computeGame, type GameState } from './engine'

export type Celebration =
  | { kind: 'achievement'; a: Achievement }
  | { kind: 'level'; level: number; title: string }
  | { kind: 'kill'; monster: Monster; drop: Item | null }

interface GameCtxValue {
  game: GameState
  queue: Celebration[]
  dismiss: () => void
}

const Ctx = createContext<GameCtxValue | null>(null)

/**
 * Computes the game state once per data change, saves newly earned
 * achievements, and queues the moments worth celebrating.
 */
export function GameProvider({ children }: { children: ReactNode }) {
  const { state, today, dispatch, sync, user } = useStore()
  const { prefs } = useThemeCtx()
  const toast = useToast()
  const game = useMemo(
    () => computeGame(state, today, prefs.themesTried, prefs.equipped),
    [state, today, prefs.themesTried, prefs.equipped],
  )
  const [queue, setQueue] = useState<Celebration[]>([])
  const firstPass = useRef(true)
  const loaded = sync.status !== 'loading'

  // Save newly reached achievements and kills (kills make loot permanent).
  const freshKey = [...game.freshIds, ...game.combat.freshKills].join(',')
  useEffect(() => {
    if (!loaded || (game.freshIds.length === 0 && game.combat.freshKills.length === 0)) return
    dispatch({ type: 'milestones/unlock', ids: [...game.combat.freshKills, ...game.freshIds], today })

    // Today's kills get their moment; old backlog kills are saved quietly.
    const fights = [...game.combat.today.fights, ...(game.combat.week ? [game.combat.week.fight] : [])]
    const kills = fights.filter((f) => game.combat.freshKills.includes(f.key))
    if (!firstPass.current || kills.length <= 3) {
      setQueue((q) => [...q, ...kills.map((f) => ({ kind: 'kill' as const, monster: f.monster, drop: f.drop }))])
    }
    if (game.freshIds.length === 0) return
    const fresh = game.achievements.filter((v) => v.fresh).map((v) => v.a)
    if (firstPass.current && fresh.length > 3) {
      // A backlog (first sign-in, an import, another device): one quiet note, not a fireworks storm.
      toast(`${fresh.length} achievements earned. See them in your hero panel.`)
    } else {
      const top = [...fresh].sort((a, b) => b.xp - a.xp)
      setQueue((q) => [...q, ...top.slice(0, 3).map((a) => ({ kind: 'achievement' as const, a }))])
      if (top.length > 3) toast(`+${top.length - 3} more achievements`)
    }
  }, [freshKey, loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Level-ups, remembered per account on this device.
  useEffect(() => {
    if (!loaded) return
    const key = `stillpoint:level:${user.id}`
    let last = 0
    try {
      last = Number(localStorage.getItem(key) ?? 0)
      localStorage.setItem(key, String(game.level.level))
    } catch {
      /* ignore */
    }
    if (last > 0 && game.level.level > last && !firstPass.current) {
      setQueue((q) => [{ kind: 'level', level: game.level.level, title: game.title }, ...q])
    }
    firstPass.current = false
  }, [game.level.level, loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), [])
  const value = useMemo(() => ({ game, queue, dismiss }), [game, queue, dismiss])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGame(): GameCtxValue {
  const c = useContext(Ctx)
  if (!c) throw new Error('useGame must be used inside <GameProvider>')
  return c
}
