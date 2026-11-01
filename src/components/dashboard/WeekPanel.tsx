import { useMemo, useState } from 'react'
import { summarizeWeek, shareText } from '../../dashboard/week'
import { useGame } from '../../game/GameProvider'
import { ITEM_COLOR } from '../../game/loot'
import { shortDate } from '../../lib/date'
import { useMoney } from '../../lib/money'
import { useStore } from '../../state/store'
import { useThemeCtx, type WeeklyGoals } from '../../themes/vibe'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'

function Goal({ label, value, goal, edit, onGoal, max }: { label: string; value: number; goal: number; edit: boolean; onGoal: (n: number) => void; max: number }) {
  const done = value >= goal
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={done ? 'text-ink' : 'text-ink-2'}>
          {done && <span aria-hidden="true">✓ </span>}
          {label}
        </span>
        {edit ? (
          <span className="flex items-center gap-1">
            <button type="button" aria-label={`Fewer ${label}`} className="btn size-7 rounded-full border border-line text-ink-2" onClick={() => onGoal(Math.max(label.startsWith('No-spend') ? 0 : 1, goal - 1))}>
              −
            </button>
            <span className="w-6 text-center tabular">{goal}</span>
            <button type="button" aria-label={`More ${label}`} className="btn size-7 rounded-full border border-line text-ink-2" onClick={() => onGoal(Math.min(max, goal + 1))}>
              +
            </button>
          </span>
        ) : (
          <span className="text-[13px] text-muted tabular">
            {Math.min(value, 99)} / {goal}
          </span>
        )}
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(value, goal)} aria-label={label}>
        <div className="h-full rounded-full bg-accent-sand transition-[width] duration-500" style={{ width: `${Math.min(100, (value / Math.max(1, goal)) * 100)}%`, opacity: done ? 1 : 0.7 }} />
      </div>
    </li>
  )
}

/** Weekly targets you set yourself, and the week's chronicle: what you did, slew and kept. */
export function WeekPanel() {
  const { state, today, user } = useStore()
  const { game } = useGame()
  const { prefs, setGoals } = useThemeCtx()
  const { format } = useMoney()
  const toast = useToast()
  const [edit, setEdit] = useState(false)
  const w = useMemo(() => summarizeWeek(state, today), [state, today])
  const g = prefs.goals
  const set = (k: keyof WeeklyGoals) => (n: number) => setGoals({ ...g, [k]: n })
  const loot = game.combat.inventory.filter((i) => i.date >= w.start && i.date <= w.end)
  const slain = w.kills.minion + w.kills.elite + w.kills.boss
  // days off shrink the goal so a sick week can still be a won week
  const habitGoal = Math.max(0, Math.min(g.habitDays, 7 - w.restDays))
  const allDone = w.workouts >= g.workouts && w.habitDays >= habitGoal && w.noSpendDays >= g.noSpendDays
  const sunday = today === w.end

  const share = async () => {
    const text = shareText(w, format, user.name?.split(/\s+/)[0])
    try {
      if (navigator.share) await navigator.share({ title: 'My Stillpoint week', text })
      else {
        await navigator.clipboard.writeText(text)
        toast('Chronicle copied. Paste it anywhere.')
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <Panel
      id="week"
      title="This week"
      hint={sunday ? 'Your chronicle is ready. The week closes tonight.' : `${shortDate(w.start)} to ${shortDate(w.end)}. Goals are yours to set.`}
      actions={
        <Button size="sm" variant="ghost" onClick={() => setEdit((e) => !e)} aria-pressed={edit}>
          {edit ? 'Done' : 'Edit goals'}
        </Button>
      }
    >
      <ul className="space-y-4">
        <Goal label="Strong habit days" value={w.habitDays} goal={edit ? g.habitDays : habitGoal} edit={edit} onGoal={set('habitDays')} max={7} />
        <Goal label="Workouts" value={w.workouts} goal={g.workouts} edit={edit} onGoal={set('workouts')} max={4} />
        <Goal label="No-spend days" value={w.noSpendDays} goal={g.noSpendDays} edit={edit} onGoal={set('noSpendDays')} max={7} />
      </ul>
      {allDone && !edit && <p className="mt-4 rounded-xl bg-surface-2 px-4 py-2.5 text-sm text-ink">Every goal met this week. Well earned.</p>}

      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-4">
        {[
          ['Ticks', w.ticks],
          ['Monsters slain', slain],
          ['Meals', w.meals],
          ['Extras', format(w.extrasCents)],
        ].map(([k, v]) => (
          <div key={k as string} className="bg-surface px-3 py-2.5">
            <dt className="text-[12px] text-muted">{k}</dt>
            <dd className="mt-0.5 font-display text-lg text-ink tabular">{v}</dd>
          </div>
        ))}
      </dl>

      {(w.bestDay || loot.length > 0) && (
        <div className="mt-4 space-y-2 text-[13px] text-ink-2">
          {w.bestDay && (
            <p>
              Best day: {shortDate(w.bestDay.date)}, {w.bestDay.ticks} {w.bestDay.ticks === 1 ? 'habit' : 'habits'} done.
            </p>
          )}
          {loot.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5">
              <span>Loot:</span>
              {loot.slice(0, 4).map((i) => (
                <span key={i.id} className="rounded-md border px-1.5 py-0.5 text-[12px]" style={{ borderColor: ITEM_COLOR[i.rarity], color: ITEM_COLOR[i.rarity] }}>
                  {i.name}
                </span>
              ))}
              {loot.length > 4 && <span className="text-muted">+{loot.length - 4} more</span>}
            </p>
          )}
        </div>
      )}

      <Button className="mt-5 w-full" onClick={() => void share()}>
        Share my chronicle
      </Button>
    </Panel>
  )
}
