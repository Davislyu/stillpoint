import { useEffect, useRef, useState } from 'react'
import { loadAllThemeCss, THEMES, type ThemeDef } from '../../themes/registry'
import { useThemeCtx, type Mode } from '../../themes/vibe'
import { Button } from '../ui/Button'
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from '../ui/Icons'

/** A live miniature of the app in a theme: real hooks, real fonts, real voice. */
function Preview({ def, dark }: { def: ThemeDef; dark: boolean }) {
  const v = def.vibe
  return (
    <div
      data-theme={def.id}
      className={`theme-scope pointer-events-none relative h-44 overflow-hidden p-4 ${def.id === 'stillpoint' && dark ? 'dark' : ''}`}
      aria-hidden="true"
    >
      <p className="hero-title font-display font-medium text-ink">{v.greeting('Good morning')}</p>
      <div className="panel mt-3 rounded-2xl border border-line bg-surface p-3">
        <header>
          <h3 className="panel-title font-display text-[0.95rem] font-semibold text-ink">{v.title('Daily habits')}</h3>
        </header>
        <div className="mt-2 flex items-center gap-2 text-[0.9em]">
          <span
            data-done="true"
            className="check grid size-4 place-items-center rounded-full border-[1.5px]"
            style={{ borderColor: 'var(--accent-sage)', background: 'var(--accent-sage)' }}
          >
            <CheckIcon width={10} height={10} strokeWidth={3} className="text-surface" />
          </span>
          <span className="text-muted line-through">Gym</span>
          <span
            data-done="false"
            className="check ml-3 size-4 rounded-full border-[1.5px]"
            style={{ borderColor: 'var(--accent-dusk)' }}
          />
          <span className="text-ink">Stretch</span>
          <span className="btn btn-primary ml-auto inline-flex h-7 items-center rounded-full bg-ink px-3 text-[0.75em] text-bg">
            {v.level} 12
          </span>
        </div>
      </div>
    </div>
  )
}

const MODES: { id: Mode; label: string; Icon: typeof SunIcon }[] = [
  { id: 'light', label: 'Light', Icon: SunIcon },
  { id: 'system', label: 'System', Icon: MonitorIcon },
  { id: 'dark', label: 'Dark', Icon: MoonIcon },
]

export function AppearanceDialog({ onClose }: { onClose: () => void }) {
  const { prefs, setTheme, setMode, setGalleryOpen } = useThemeCtx()
  const [ready, setReady] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const stillDark = prefs.mode === 'dark' || (prefs.mode === 'system' && systemDark)

  useEffect(() => {
    setGalleryOpen(true)
    void loadAllThemeCss().then(() => setReady(true))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      setGalleryOpen(false)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appearance-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="anim-rise flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-line bg-bg shadow-2xl outline-none sm:rounded-3xl"
      >
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 pt-5 pb-4 sm:px-7">
          <div className="min-w-0">
            <h2 id="appearance-title" className="font-display text-xl font-medium sm:text-2xl tracking-[-0.02em] text-ink">
              Themes
            </h2>
            <p className="mt-1 text-sm text-muted">Each one changes type, shape and voice, not just colour. Your pick follows you to every device.</p>
          </div>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </header>
        <div className="overflow-y-auto px-5 py-5 sm:px-7">
          <div role="radiogroup" aria-label="Theme" className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${ready ? '' : 'opacity-60'}`}>
            {THEMES.map((def) => {
              const on = prefs.theme === def.id
              return (
                <button
                  key={def.id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTheme(def.id)}
                  className={`group overflow-hidden rounded-2xl border text-left transition-[border-color,transform] hover:-translate-y-0.5 ${
                    on ? 'border-ink ring-2 ring-ink' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <Preview def={def} dark={stillDark} />
                  <div className="flex items-start justify-between gap-3 border-t border-line bg-surface px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{def.name}</p>
                      <p className="text-[13px] leading-snug text-muted">{def.tagline}</p>
                    </div>
                    {on && (
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ink text-bg">
                        <CheckIcon width={14} height={14} />
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          {prefs.theme === 'stillpoint' && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm text-ink-2">Stillpoint brightness</span>
              <div role="radiogroup" aria-label="Brightness" className="flex rounded-full border border-line p-0.5">
                {MODES.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={prefs.mode === id}
                    onClick={() => setMode(id)}
                    className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] ${
                      prefs.mode === id ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Icon width={15} height={15} /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
