import { useState, type FormEvent } from 'react'
import { CATEGORIES, currencySymbol, looksEssential, parseAmountToCents } from '../../lib/money'
import { useStore } from '../../state/store'
import type { SpendingCategory } from '../../state/types'
import { Button } from '../ui/Button'
import { Field, Input, inputClass } from '../ui/Field'
import { PlusIcon } from '../ui/Icons'
import { useToast } from '../ui/Toast'

export function SpendingForm() {
  const { dispatch, today } = useStore()
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<SpendingCategory>('coffee')
  const [date, setDate] = useState(today)

  const cents = parseAmountToCents(amount)
  const essential = looksEssential(description)
  const valid = cents !== null && description.trim().length > 0 && !essential && date <= today

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || cents === null) return
    dispatch({ type: 'spending/add', date, amountCents: cents, description, category })
    toast('Added to extra spendings.')
    setAmount('')
    setDescription('')
    setDate(today)
  }

  return (
    <form onSubmit={submit} className="space-y-3" aria-label="Add an extra spending">
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
            placeholder="Flat white"
            maxLength={80}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={essential}
            aria-describedby={essential ? 'essential-note' : undefined}
          />
        </Field>
      </div>
      {essential && (
        <p id="essential-note" className="text-[13px] text-ink-2">
          That sounds like an essential cost. This ledger only tracks extras, so groceries and bills stay out of it.
        </p>
      )}

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
