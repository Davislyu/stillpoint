import { ACCENTS, accentVar } from '../../lib/accents'
import type { AccentId } from '../../state/types'

interface Props {
  value: AccentId
  onChange: (id: AccentId) => void
  label?: string
}

export function AccentPicker({ value, onChange, label = 'Colour' }: Props) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {ACCENTS.map((a) => {
        const selected = a.id === value
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={a.label}
            title={a.label}
            onClick={() => onChange(a.id)}
            className="grid size-7 place-items-center rounded-full transition-transform hover:scale-110"
            style={{ boxShadow: selected ? `0 0 0 2px var(--surface), 0 0 0 3.5px ${accentVar(a.id)}` : undefined }}
          >
            <span className="size-5 rounded-full" style={{ background: accentVar(a.id) }} />
          </button>
        )
      })}
    </div>
  )
}
