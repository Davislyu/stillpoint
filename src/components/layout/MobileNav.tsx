import type { SVGProps } from 'react'
import type { Tab } from '../../dashboard/layout'
import { BookIcon, ListIcon } from '../ui/Icons'

export type View = Tab

const BodyIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" {...p}>
    <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
  </svg>
)
const CoinIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2-.4-2.5-1.2M12 6.5V8M12 16v1.5" />
  </svg>
)
const StarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
  </svg>
)

const TAB_META: Record<View, { label: string; Icon: (p: SVGProps<SVGSVGElement>) => React.ReactElement }> = {
  today: { label: 'Today', Icon: ListIcon },
  body: { label: 'Body', Icon: BodyIcon },
  notes: { label: 'Notes', Icon: BookIcon },
  money: { label: 'Spending', Icon: CoinIcon },
  hero: { label: 'Hero', Icon: StarIcon },
}

/**
 * Floating tab bar on phones. Fixed height and equal-width tabs, so nothing
 * resizes when the active tab or the browser's toolbar changes; it only glides
 * up and down with the safe area.
 */
export function MobileNav({ view, tabs, onChange }: { view: View; tabs: View[]; onChange: (v: View) => void }) {
  if (tabs.length < 2) return null
  const index = Math.max(0, tabs.indexOf(view))
  return (
    <nav aria-label="Sections" className="tabbar-wrap pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3 lg:hidden">
      <div
        className="tabbar pointer-events-auto relative grid h-16 w-full max-w-md overflow-hidden rounded-[1.4rem] border border-line bg-bg/85 p-1 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className="tabbar-pill absolute inset-y-1 left-1 rounded-[1.1rem] bg-surface-2 transition-transform duration-300 ease-[cubic-bezier(.3,.7,.2,1)]"
          style={{ width: `calc((100% - 0.5rem) / ${tabs.length})`, transform: `translateX(${index * 100}%)` }}
        />
        {tabs.map((id) => {
          const { label, Icon } = TAB_META[id]
          const active = view === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={`relative z-10 flex min-w-0 flex-col items-center justify-center gap-1 rounded-[1.1rem] text-[11px] leading-none font-medium transition-[color,transform] duration-200 select-none active:scale-95 ${
                active ? 'text-ink' : 'text-muted'
              }`}
            >
              <Icon width={22} height={22} className={`transition-transform duration-300 ${active ? '-translate-y-px' : ''}`} />
              <span className="max-w-full truncate">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
