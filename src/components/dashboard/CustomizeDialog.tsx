import { useEffect, useState } from 'react'
import { aurasFor, AURA_BY_ID, layoutFromAura, type Layout } from '../../dashboard/layout'
import { useStore } from '../../state/store'
import { useThemeCtx } from '../../themes/vibe'
import { Button } from '../ui/Button'
import { AuraCard, LayoutEditor } from './AuraPicker'

/** Change aura or panel visibility after onboarding. Changes apply live. */
export default function CustomizeDialog({ onClose }: { onClose: () => void }) {
  const { user } = useStore()
  const { prefs, setLayout, setTheme } = useThemeCtx()
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
        </div>
      </div>
    </div>
  )
}
