import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export const inputClass =
  'field h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink placeholder:text-muted transition-colors focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-ink-2'

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] text-ink-2">{label}</span>
      {children}
    </label>
  )
}

export const Input = ({ className = '', ...p }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={`${inputClass} ${className}`} {...p} />
)

export const Select = ({ className = '', children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select className={`${inputClass} appearance-none pr-9 ${className}`} {...p}>
      {children}
    </select>
    <svg
      viewBox="0 0 12 12"
      className="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  </div>
)
