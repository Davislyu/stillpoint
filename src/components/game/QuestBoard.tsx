import { startOfWeek } from '../../lib/date'
import { useGame } from '../../game/GameProvider'
import { useStore } from '../../state/store'
import { workoutsInWeek } from '../../state/selectors'
import { useVibe } from '../../themes/vibe'
import { CheckIcon } from '../ui/Icons'
import { Panel } from '../ui/Panel'

export function QuestBoard() {
  const { game } = useGame()
  const { state, today } = useStore()
  const vibe = useVibe()
  const done = game.todayQuests.filter((q) => q.done).length
  const workouts = workoutsInWeek(state, startOfWeek(today))

  return (
    <Panel
      id="quests"
      title={vibe.quest}
      hint={done === 3 ? 'Board cleared. +50 bonus XP.' : `${done} of 3 done. New quests at midnight.`}
      actions={
        <span className="text-[13px] text-muted tabular" title="Days in a row you've logged something">
          {game.stats.currentActiveStreak} day{game.stats.currentActiveStreak === 1 ? '' : 's'} active
        </span>
      }
    >
      <ul className="space-y-2">
        {game.todayQuests.map(({ quest, done: ok, pending }) => (
          <li key={quest.id} className={`quest flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${ok ? 'border-transparent bg-surface-2' : 'border-line'}`}>
            <span
              data-done={ok}
              className={`check grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] ${ok ? 'border-accent-sand bg-accent-sand' : 'border-line-strong'}`}
            >
              {ok && <CheckIcon width={12} height={12} strokeWidth={2.6} className="anim-settle text-surface" />}
            </span>
            <span className={`flex-1 text-sm ${ok ? 'text-muted line-through' : 'text-ink'}`}>
              {quest.label}
              {pending && <span className="ml-1 text-[12px] text-muted no-underline">(on track, counts at midnight)</span>}
            </span>
            <span className={`text-[12px] tabular ${ok ? 'text-accent-sand' : 'text-muted'}`}>+{quest.xp} {vibe.xp}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-[13px]">
        <span className="text-ink-2">Weekly: 4 workouts</span>
        <span className="flex flex-1 gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < workouts ? 'bg-accent-dusk' : 'bg-surface-2'}`} />
          ))}
        </span>
        <span className="text-muted tabular">+60 {vibe.xp}</span>
      </div>
    </Panel>
  )
}
