import { useState } from 'react'
import { shortDate } from '../../lib/date'
import { uid } from '../../lib/id'
import { useStore } from '../../state/store'
import type { Exercise } from '../../state/types'
import { Button } from '../ui/Button'
import { inputClass } from '../ui/Field'
import { PlusIcon } from '../ui/Icons'
import { Panel } from '../ui/Panel'

const PRESETS = ['Bench press', 'Squat', 'Deadlift', 'Overhead press', 'Barbell row', 'Pull-up']
const STEPS = [1.25, 2.5, 5]
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)))

function Spark({ ex }: { ex: Exercise }) {
  const pts = ex.history.slice(-12)
  if (pts.length < 2) return <div className="h-9" aria-hidden="true" />
  const lo = Math.min(...pts.map((p) => p.kg))
  const hi = Math.max(...pts.map((p) => p.kg))
  const span = hi - lo || 1
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * 100, 30 - ((p.kg - lo) / span) * 26] as const)
  return (
    <svg viewBox="0 0 100 34" preserveAspectRatio="none" className="h-9 w-full text-accent-clay" role="img" aria-label={`Progress over your last ${pts.length} PRs, from ${fmt(lo)} to ${fmt(hi)} kilograms`}>
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="2.2" fill="currentColor" />
    </svg>
  )
}

function LiftCard({ ex }: { ex: Exercise }) {
  const { dispatch, today } = useStore()
  const [open, setOpen] = useState(false)
  const [kg, setKg] = useState(ex.kg)
  const [reps, setReps] = useState(ex.reps)
  const [confirm, setConfirm] = useState(false)
  const bump = (d: number) => setKg((v) => Math.max(0, Math.round((v + d) * 100) / 100))
  const isPr = kg > ex.kg || (kg === ex.kg && reps > ex.reps)
  const beginPr = () => (setKg(ex.kg), setReps(ex.reps), setOpen(true))
  const save = () => {
    dispatch({ type: 'exercise/pr', id: ex.id, kg, reps, today })
    setOpen(false)
  }
  const btn = 'grid h-10 min-w-12 place-items-center rounded-full border border-line px-3 text-sm text-ink-2 tabular hover:bg-surface-2 hover:text-ink active:scale-95'

  return (
    <li className="rounded-2xl border border-line bg-bg p-4" data-testid="lift-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-ink">{ex.name}</h3>
          <p className="text-[12px] text-muted">
            {ex.prOn ? `PR ${shortDate(ex.prOn)}` : 'No PR logged yet'}
            {ex.reps > 1 ? ` · ${ex.reps} reps` : ''}
          </p>
        </div>
        <p className="font-display leading-none tracking-[-0.03em] text-ink tabular" aria-label={`${fmt(ex.kg)} kilograms`}>
          <span className="text-[2.4rem] font-medium">{fmt(ex.kg)}</span>
          <span className="ml-1 text-sm text-muted">kg</span>
        </p>
      </div>
      <Spark ex={ex} />

      {open ? (
        <div className="mt-2 rounded-xl bg-surface-2 p-3">
          <div className="flex items-center justify-center gap-3">
            <button type="button" className={btn} aria-label="Lower weight" onClick={() => bump(-STEPS[0])}>
              −
            </button>
            <label className="text-center">
              <span className="sr-only">New weight in kilograms</span>
              <input inputMode="decimal" type="number" step="0.25" min={0} max={999} value={kg} onChange={(e) => setKg(Math.max(0, Math.min(999, Number(e.target.value) || 0)))} className={`${inputClass} h-14 w-28 text-center font-display text-3xl tabular`} />
            </label>
            <button type="button" className={btn} aria-label="Raise weight" onClick={() => bump(STEPS[0])}>
              +
            </button>
          </div>
          <div className="mt-2 flex justify-center gap-1.5" role="group" aria-label="Quick add">
            {STEPS.map((s) => (
              <button key={s} type="button" className={btn} onClick={() => bump(s)}>
                +{fmt(s)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-[13px] text-ink-2">
            <span>Reps</span>
            <span className="flex items-center gap-2">
              <button type="button" className={btn} aria-label="Fewer reps" onClick={() => setReps((r) => Math.max(1, r - 1))}>
                −
              </button>
              <span className="min-w-6 text-center text-ink tabular">{reps}</span>
              <button type="button" className={btn} aria-label="More reps" onClick={() => setReps((r) => Math.min(100, r + 1))}>
                +
              </button>
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" className="flex-1" onClick={save} disabled={kg <= 0}>
              {isPr ? 'Save new PR' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <Button variant="primary" className="flex-1" onClick={beginPr}>
            New PR
          </Button>
          {confirm ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'exercise/remove', id: ex.id })}>
                Remove
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
                Keep
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" aria-label={`Remove ${ex.name}`} onClick={() => setConfirm(true)}>
              ···
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

export function LiftTracker() {
  const { state, dispatch, today, backend } = useStore()
  const [name, setName] = useState('')
  const [kg, setKg] = useState('')
  const missing = backend.missingTables?.().includes('exercises') ?? false
  const have = new Set(state.exercises.map((e) => e.name.toLowerCase()))
  const add = (n: string, w: number) => {
    const clean = n.trim().slice(0, 60)
    if (!clean || have.has(clean.toLowerCase())) return
    dispatch({ type: 'exercise/add', id: uid(), name: clean, kg: w, reps: 1, today })
    setName('')
    setKg('')
  }

  return (
    <Panel id="lifts" title="Lifts" hint="Your best weight for each exercise, in kg. Tap New PR when you beat it.">
      {missing && (
        <p className="mb-3 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink-2" role="status">
          Lifts need a one-time database update before they can be saved. Run the exercises migration in Supabase, then reload.
        </p>
      )}
      {state.exercises.length > 0 && (
        <ul className="grid gap-3">
          {state.exercises.map((e) => (
            <LiftCard key={e.id} ex={e} />
          ))}
        </ul>
      )}
      <form
        className={`${state.exercises.length ? 'mt-4' : ''} flex gap-2`}
        onSubmit={(e) => (e.preventDefault(), add(name, Math.max(0, Number(kg) || 0)))}
      >
        <input aria-label="Exercise name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Add an exercise" className={`${inputClass} min-w-0 flex-1`} />
        <input aria-label="Starting weight in kilograms" inputMode="decimal" type="number" step="0.25" min={0} max={999} value={kg} onChange={(e) => setKg(e.target.value)} placeholder="kg" className={`${inputClass} w-20! shrink-0`} />
        <Button type="submit" variant="secondary" aria-label="Add exercise" disabled={!name.trim()}>
          <PlusIcon />
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Common exercises">
        {PRESETS.filter((p) => !have.has(p.toLowerCase())).map((p) => (
          <button key={p} type="button" className="h-7 rounded-full border border-line px-2.5 text-[12px] text-ink-2 hover:bg-surface-2 hover:text-ink" onClick={() => setName(p)}>
            {p}
          </button>
        ))}
      </div>
    </Panel>
  )
}
