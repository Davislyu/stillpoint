interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
  id: string
}

export function Switch({ checked, onChange, label, description, id }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full border transition-colors duration-200 ${
          checked ? 'border-ink bg-ink' : 'border-line-strong bg-surface-2'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-[18px] rounded-full transition-transform duration-200 ${
            checked ? 'translate-x-4 bg-bg' : 'bg-muted'
          }`}
        />
      </button>
    </div>
  )
}
