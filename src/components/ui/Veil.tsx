import type { ReactNode } from 'react'
import { useHide } from '../../hooks/useHide'

/**
 * Covers private content when "hidden" is on: everything inside is blurred, can't be
 * selected, clicked or tabbed into, and a label says why. Nothing is deleted or sent anywhere.
 */
export function Veil({ children }: { children: ReactNode }) {
  const [hide] = useHide()
  return (
    <div className="relative">
      <div inert={hide} aria-hidden={hide || undefined} className={hide ? 'pointer-events-none blur-[9px] select-none' : ''}>
        {children}
      </div>
      {hide && (
        <p className="absolute inset-x-0 top-6 z-10 mx-auto w-fit rounded-full border border-line-strong bg-float px-3.5 py-1.5 font-mono text-[12px] text-ink shadow-lg" role="status">
          Hidden on screen. Tap the lock to show.
        </p>
      )}
    </div>
  )
}
