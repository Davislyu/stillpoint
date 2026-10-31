import { useState, type FormEvent } from 'react'
import { ACCENTS } from '../../lib/accents'
import { useStore } from '../../state/store'
import type { AccentId } from '../../state/types'
import { AccentPicker } from '../ui/AccentPicker'
import { Button } from '../ui/Button'
import { inputClass } from '../ui/Field'
import { PlusIcon } from '../ui/Icons'

export function AddHabitForm() {
  const { state, dispatch, today } = useStore()
  const [name, setName] = useState('')
  // Rotate through accents so new habits look distinct by default.
  const [accent, setAccent] = useState<AccentId>(ACCENTS[state.habits.length % ACCENTS.length].id)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'habit/add', name, accent, today })
    setName('')
    setAccent(ACCENTS[(state.habits.length + 1) % ACCENTS.length].id)
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-line pt-4">
      <div className="flex gap-2">
        <input
          aria-label="New habit name"
          className={inputClass}
          placeholder="Add a habit, like Read 10 pages"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={!name.trim()} className="shrink-0">
          <PlusIcon /> Add
        </Button>
      </div>
      <AccentPicker value={accent} onChange={setAccent} label="New habit colour" />
    </form>
  )
}
