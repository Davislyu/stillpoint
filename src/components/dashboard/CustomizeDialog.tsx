import { useEffect, useState } from 'react'
import { useInstall } from '../../hooks/useInstall'
import { arrangementFrom, aurasFor, AURA_BY_ID, layoutFromAura, type Layout } from '../../dashboard/layout'
import { setArranging } from '../../hooks/useArrange'
import { useStore } from '../../state/store'
import { useThemeCtx } from '../../themes/vibe'
import { Button } from '../ui/Button'
import { AuraCard, LayoutEditor } from './AuraPicker'

/** Change aura or panel visibility after onboarding. Changes apply live. */
export default function CustomizeDialog({ onClose }: { onClose: () => void }) {
  const { user } = useStore()
  const { prefs, setLayout, setTheme, setReminder } = useThemeCtx()
  const install = useInstall()
  const [permNote, setPermNote] = useState('')
  const rem = prefs.reminder
  const [layout, setDraft] = useState<Layout>(() => prefs.layout ?? layoutFromAura(AURA_BY_ID['quiet-wanderer'], user.id))

  const change = (l: Layout) => {
    setDraft(l)
    setLayout(l)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customize-title"
        onClick={(e) => e.stopPropagation()}
        className="sheet anim-rise flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-bg shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4 sm:px-7">
          <div className="min-w-0">
            <h2 id="customize-title" className="font-display text-xl font-medium sm:text-2xl tracking-[-0.01em] text-ink">
              Customize dashboard
            </h2>
            <p className="mt-1 text-sm text-muted">Changes apply right away and follow your account to every device.</p>
          </div>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </header>
        <div className="overscroll-contain overflow-y-auto px-5 py-5 sm:px-7">
          <h3 className="mb-2 text-[13px] text-ink-2">Aura</h3>
          <div role="radiogroup" aria-label="Auras" className="grid gap-2.5 sm:grid-cols-2">
            {aurasFor(user.email).map((a) => (
              <AuraCard
                key={a.id}
                aura={a}
                selected={layout.aura === a.id}
                onSelect={() => {
                  change(layoutFromAura(a, user.id))
                  setTheme(a.theme)
                }}
              />
            ))}
          </div>
          <h3 className="mt-6 mb-2 text-[13px] text-ink-2">Panels</h3>
          <LayoutEditor layout={layout} onChange={change} />

          <h3 className="mt-6 mb-2 hidden text-[13px] text-ink-2 lg:block">Arrange</h3>
          <div className="hidden items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 lg:flex">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">Drag panels where you want them</p>
              <p className="text-[12px] leading-snug text-muted">Move panels around the page and pull a corner to change their size. Wide screens only.</p>
            </div>
            {layout.order && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  change({ ...layout, order: undefined, sizes: undefined })
                }}
              >
                Reset
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!layout.order) change({ ...layout, ...arrangementFrom(layout) })
                setArranging(true)
                onClose()
              }}
            >
              {layout.order ? 'Rearrange' : 'Start'}
            </Button>
          </div>

          <h3 className="mt-6 mb-2 text-[13px] text-ink-2">Evening reminder</h3>
          <div className="rounded-2xl border border-line bg-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">Nudge me about unfinished habits</p>
                <p className="text-[12px] leading-snug text-muted">Shows while Stillpoint is open or installed. Phones don't wake a closed web app.</p>
              </div>
              <input
                type="time"
                aria-label="Reminder time"
                value={rem.time}
                disabled={!rem.enabled}
                onChange={(e) => e.target.value && setReminder({ ...rem, time: e.target.value })}
                className="field h-10 rounded-lg border border-line bg-surface-2 px-2 text-sm text-ink disabled:opacity-40"
              />
              <button
                type="button"
                role="switch"
                aria-checked={rem.enabled}
                aria-label="Evening reminder"
                onClick={async () => {
                  const next = !rem.enabled
                  setPermNote('')
                  if (next && 'Notification' in window && Notification.permission === 'default') {
                    const r = await Notification.requestPermission().catch(() => 'denied')
                    if (r !== 'granted') setPermNote('Notifications are off for this site, so the reminder will appear inside the app instead.')
                  }
                  setReminder({ ...rem, enabled: next })
                }}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${rem.enabled ? 'bg-ink' : 'bg-surface-2 ring-1 ring-line-strong ring-inset'}`}
              >
                <span className={`absolute top-1 left-1 size-5 rounded-full bg-bg shadow transition-transform duration-200 ${rem.enabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {permNote && <p className="mt-2 text-[12px] text-muted">{permNote}</p>}
          </div>

          {!install.installed && (install.canPrompt || install.iosHint) && (
            <>
              <h3 className="mt-6 mb-2 text-[13px] text-ink-2">Home screen</h3>
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <p className="min-w-0 flex-1 text-sm text-ink-2">
                  {install.canPrompt ? 'Install Stillpoint for one-tap logging from your home screen.' : 'On iPhone: tap Share, then Add to Home Screen.'}
                </p>
                {install.canPrompt && (
                  <Button variant="primary" size="sm" onClick={() => void install.install()}>
                    Install
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
