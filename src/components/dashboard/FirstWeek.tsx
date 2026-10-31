import { useState } from 'react'
import { daysBetween } from '../../lib/date'
import { useGame } from '../../game/GameProvider'
import { useStore } from '../../state/store'
import { Panel } from '../ui/Panel'

/** A short, friendly checklist for a new account's first week. Never nags. */
export function FirstWeek() {
  const { state, today, user } = useStore()
  const { game } = useGame()
  const key = `stillpoint:firstweek:${user.id}`
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  })
  const first = state.habits.reduce<string | null>((a, h) => (a === null || h.createdOn < a ? h.createdOn : a), null)
  if (dismissed || !first || daysBetween(first, today) > 7) return null

  const steps: [string, boolean][] = [
    ['Tick your first habit', Object.values(state.completions).some((c) => c.length > 0)],
    ['Log a meal', Object.values(state.meals).some((d) => Object.values(d).some((m) => m?.isCompleted))],
    ['Write one line in your notes', Object.values(state.observations).some((o) => o.criticalThinking.trim() || o.observations.trim())],
    ['Slay a monster', game.combat.kills.minion + game.combat.kills.elite + game.combat.kills.boss > 0],
    ['Pick up your first loot', game.combat.inventory.length > 0],
  ]
  const done = steps.filter(([, ok]) => ok).length
  if (done === steps.length) return null

  return (
    <Panel
      id="first-week"
      title="Your first week"
      hint={`${done} of ${steps.length} done. Small steps; there is no rush.`}
      actions={
        <button
          type="button"
          className="btn rounded-full px-2 py-1 text-[12px] text-muted hover:text-ink"
          onClick={() => {
            try {
              localStorage.setItem(key, '1')
            } catch {
              /* ignore */
            }
            setDismissed(true)
          }}
        >
          Hide
        </button>
      }
    >
      <ul className="space-y-2">
        {steps.map(([label, ok]) => (
          <li key={label} className={`flex items-center gap-3 text-sm ${ok ? 'text-muted line-through' : 'text-ink'}`}>
            <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${ok ? 'border-accent-sage bg-accent-sage text-bg' : 'border-line-strong'}`}>
              {ok ? '✓' : ''}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
