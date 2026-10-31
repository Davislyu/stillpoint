import { useState } from 'react'
import { accentVar } from '../../lib/accents'
import type { DateKey, Habit } from '../../state/types'
import { isDone } from '../../state/selectors'
import { useStore } from '../../state/store'
import { AccentPicker } from '../ui/AccentPicker'
import { IconButton } from '../ui/Button'
import { inputClass } from '../ui/Field'
import { CheckIcon, XIcon } from '../ui/Icons'

interface Props {
  habit: Habit
  date: DateKey
  editing: boolean
}

export function HabitRow({ habit, date, editing }: Props) {
  const { state, dispatch, today } = useStore()
  const done = isDone(state, habit.id, date)
  const [name, setName] = useState(habit.name)
  const color = accentVar(habit.accent)

  if (editing) {
    const commit = () => {
      if (name.trim() && name.trim() !== habit.name) dispatch({ type: 'habit/rename', id: habit.id, name })
      else setName(habit.name)
    }
    return (
      <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
        <input
          aria-label={`Rename ${habit.name}`}
          className={`${inputClass} sm:flex-1`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        />
        <div className="flex items-center justify-between gap-3">
          <AccentPicker
            label={`Colour for ${habit.name}`}
            value={habit.accent}
            onChange={(accent) => dispatch({ type: 'habit/recolor', id: habit.id, accent })}
          />
          <IconButton
            aria-label={`Remove ${habit.name}`}
            title="Remove habit (past days keep their history)"
            onClick={() => dispatch({ type: 'habit/remove', id: habit.id, today })}
          >
            <XIcon />
          </IconButton>
        </div>
      </li>
    )
  }

  return (
    <li>
      <label className="group flex cursor-pointer items-center gap-3.5 rounded-xl px-2 py-2.5 -mx-2 transition-colors hover:bg-surface-2">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={done}
          onChange={() => dispatch({ type: 'habit/toggle', id: habit.id, date })}
        />
        <span
          aria-hidden="true"
          data-done={done}
          className="check grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink-2"
          style={{ borderColor: color, background: done ? color : 'transparent' }}
        >
          {done && <CheckIcon key="c" className="anim-settle text-surface" width={14} height={14} strokeWidth={2.4} />}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-[15px] transition-colors duration-200 ${
            done ? 'text-muted line-through decoration-line-strong' : 'text-ink'
          }`}
        >
          {habit.name}
        </span>
      </label>
    </li>
  )
}
