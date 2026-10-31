import type { SVGProps } from 'react'
import { BookIcon, ListIcon } from '../ui/Icons'

export type View = 'today' | 'body' | 'notes' | 'money' | 'hero'

const BodyIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" {...p}>
    <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
  </svg>
)
const CoinIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2-.4-2.5-1.2M12 6.5V8M12 16v1.5" />
  </svg>
)

const StarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
  </svg>
)

const TABS: { id: View; label: string; Icon: (p: SVGProps<SVGSVGElement>) => React.ReactElement }[] = [
  { id: 'today', label: 'Today', Icon: ListIcon },
  { id: 'body', label: 'Body', Icon: BodyIcon },
  { id: 'notes', label: 'Notes', Icon: BookIcon },
  { id: 'money', label: 'Spending', Icon: CoinIcon },
  { id: 'hero', label: 'Hero', Icon: StarIcon },
]

/** Bottom tab bar on small screens; on desktop every section is visible. */
export function MobileNav({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav
      aria-label="Sections"
      className="tabbar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => {
              onChange(id)
              window.scrollTo({ top: 0 })
            }}
            aria-current={view === id ? 'page' : undefined}
            className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
              view === id ? 'text-ink' : 'text-muted'
            }`}
          >
            <Icon width={19} height={19} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
