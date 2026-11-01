import { useState } from 'react'
import { shortDate, relativeDays } from '../../lib/date'
import { activeHabits, completionOn } from '../../state/selectors'
import { useStore } from '../../state/store'
import type { DateKey } from '../../state/types'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { AddHabitForm } from './AddHabitForm'
import { DayOff } from './DayOff'
import { HabitRow } from './HabitRow'

interface Props {
  date: DateKey
  onBackToToday: () => void
}

export function HabitList({ date, onBackToToday }: Props) {
  const { state, today } = useStore()
  const [editing, setEditing] = useState(false)
  const isToday = date === today
  // When editing, show every current habit; otherwise show what counted on `date`.
  // On past days, also offer habits added later so they can be back-filled;
  // ticking one moves that habit's start date back to the day.
  const habits = editing
    ? state.habits.filter((h) => !h.archivedOn)
    : isToday
      ? activeHabits(state, date)
      : state.habits.filter((h) => !h.archivedOn || h.archivedOn > date)
  const { done, total } = completionOn(state, date)

  const hint = isToday ? (
    `${done} of ${total} done`
  ) : (
    <>
      Editing {relativeDays(today, date).toLowerCase()}, {shortDate(date)}: {done} of {total} counted.{' '}
      <button className="underline underline-offset-2 hover:text-ink" onClick={onBackToToday}>
        Back to today
      </button>
    </>
  )

  return (
    <Panel
      id="habits"
      title={isToday ? 'Daily habits' : 'Habits on a past day'}
      hint={hint}
      actions={
        isToday && (
          <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
            {editing ? 'Done' : 'Edit'}
          </Button>
        )
      }
    >
      {!editing && <DayOff date={date} />}
      {habits.length === 0 ? (
        <p className="py-2 text-sm text-muted">
          {isToday ? 'No habits yet. Add one below.' : 'No habits to show for this day.'}
        </p>
      ) : (
        <ul className={editing ? 'divide-y divide-line' : ''}>
          {habits.map((h) => (
            <HabitRow key={h.id + (editing ? '-e' : '')} habit={h} date={date} editing={editing && isToday} />
          ))}
        </ul>
      )}
      {isToday && editing && <AddHabitForm />}
      {isToday && !editing && habits.length === 0 && <AddHabitForm />}
    </Panel>
  )
}
