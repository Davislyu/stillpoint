import { useEffect, useState, type FormEvent } from 'react'
import { CATEGORIES, looksEssential, parseAmountToCents, useMoney } from '../../lib/money'
import { useStore } from '../../state/store'
import type { SpendingCategory } from '../../state/types'
import { Button } from '../ui/Button'
import { Field, Input, inputClass } from '../ui/Field'
import { PlusIcon } from '../ui/Icons'
import { useToast } from '../ui/Toast'

export function SpendingForm() {
  const { dispatch, today } = useStore()
  const { symbol: currencySymbol } = useMoney()
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<SpendingCategory>('coffee')
  const [date, setDate] = useState(today)
  const [justified, setJustified] = useState(false)
  // Until you touch the switch yourself, it follows what the description sounds like.
  const [touched, setTouched] = useState(false)

  const cents = parseAmountToCents(amount)
  const essential = looksEssential(description)
  const valid = cents !== null && description.trim().length > 0 && date <= today
  useEffect(() => {
    if (!touched) setJustified(essential)
  }, [essential, touched])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || cents === null) return
    dispatch({ type: 'spending/add', date, amountCents: cents, description, category, justified })
    toast(justified ? 'Logged as justified. It won’t count against your progress.' : 'Payment logged.')
    setAmount('')
    setDescription('')
    setDate(today)
    setJustified(false)
    setTouched(false)
  }

  return (
    <form onSubmit={submit} className="space-y-3" aria-label="Log a payment">
      <div className="grid grid-cols-[7.5rem_1fr] gap-2">
        <Field label="Amount">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">
              {currencySymbol}
            </span>
            <input
              className={`${inputClass} pl-7 tabular`}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={amount !== '' && cents === null}
            />
          </div>
        </Field>
        <Field label="Description">
          <Input
            placeholder="Cappuccino"
            maxLength={80}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p id="justified-label" className="text-sm text-ink">Justified</p>
          <p id="essential-note" className="text-[12px] leading-snug text-muted">
            {essential && justified && !touched
              ? 'That sounds unavoidable, so it is marked justified. It stays out of your progress.'
              : 'For payments you can’t avoid, like arnona or rent. Logged, but never hurts your progress.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={justified}
          aria-labelledby="justified-label"
          onClick={() => {
            setTouched(true)
            setJustified((j) => !j)
          }}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${justified ? 'bg-ink' : 'bg-surface-2 ring-1 ring-line-strong ring-inset'}`}
        >
          <span className={`absolute top-1 left-1 size-5 rounded-full bg-bg shadow transition-transform duration-200 ${justified ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={category === c.id}
            onClick={() => setCategory(c.id)}
            className={`h-7 rounded-full border px-2.5 text-[12px] transition-colors ${
              category === c.id ? 'border-ink-2 bg-surface-2 text-ink' : 'border-line text-muted hover:text-ink'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <Field label="Date" className="flex-1">
          <Input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value || today)} />
        </Field>
        <Button type="submit" variant="primary" disabled={!valid} className="shrink-0">
          <PlusIcon /> Add
        </Button>
      </div>
    </form>
  )
}
