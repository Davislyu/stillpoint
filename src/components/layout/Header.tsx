import { SyncIndicator } from './SyncIndicator'
import { lazy, Suspense, useState } from 'react'
import { PlayerChip } from '../game/PlayerChip'
import { UserMenu } from './UserMenu'

const AppearanceDialog = lazy(() => import('./AppearanceDialog').then((m) => ({ default: m.AppearanceDialog })))

const PaletteIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M12 3.5a8.5 8.5 0 100 17c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.5-1-2.6 0-1 .8-1.7 1.9-1.7h2.1c2 0 3.7-1.6 3.7-3.7C20.5 6.6 16.7 3.5 12 3.5z" />
    <circle cx="7.8" cy="11" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="7.4" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="7.6" r="1.1" fill="currentColor" stroke="none" />
  </svg>
)

export function Header({ onHero }: { onHero?: () => void }) {
  const [themesOpen, setThemesOpen] = useState(false)
  return (
    <div className="app-header mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
      <a href="#top" className="flex shrink-0 items-center gap-2 text-ink" aria-label="Stillpoint, home">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.45" />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" />
        </svg>
        <span className="font-display text-[15px] font-semibold tracking-[-0.01em]">Stillpoint</span>
      </a>
      <div className="flex min-w-0 items-center gap-3">
        <SyncIndicator />
        {onHero && <PlayerChip onOpen={onHero} />}
        <button
          onClick={() => setThemesOpen(true)}
          className="btn inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] text-ink-2 hover:text-ink"
          aria-haspopup="dialog"
        >
          <PaletteIcon /> <span className="hidden sm:inline">Theme</span>
        </button>
        <UserMenu />
      </div>
      {themesOpen && (
        <Suspense fallback={null}>
          <AppearanceDialog onClose={() => setThemesOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
