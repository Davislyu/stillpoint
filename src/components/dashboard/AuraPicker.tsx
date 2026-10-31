import { useState } from 'react'
import { aurasFor, AURA_BY_ID, layoutFromAura, neededBy, PANEL_TAB, PANELS, REQUIRED, sanitizeHidden, type Aura, type Layout, type PanelId } from '../../dashboard/layout'
import { defaultHabitOps } from '../../state/actions'
import { useStore } from '../../state/store'
import { THEME_BY_ID } from '../../themes/registry'
import { useThemeCtx } from '../../themes/vibe'
import { Button } from '../ui/Button'

/** A card that previews the aura in its own theme's colours, whatever theme is active. */
export function AuraCard({ aura, selected, onSelect }: { aura: Aura; selected: boolean; onSelect: () => void }) {
  const [bg, surface, ink, accent] = THEME_BY_ID[aura.theme].swatch
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border-2 p-3.5 text-left transition-[transform,border-color,box-shadow] duration-200 active:scale-[0.98]"
      style={{
        background: `linear-gradient(140deg, ${surface}, ${bg})`,
        color: ink,
        borderColor: selected ? accent : 'transparent',
        boxShadow: selected ? `0 0 0 3px ${accent}33, 0 10px 30px -12px ${accent}` : '0 1px 2px rgb(0 0 0 / 0.12)',
      }}
    >
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl"
        style={{ background: `${accent}26`, color: accent, border: `1px solid ${accent}55` }}
      >
        {aura.emblem}
        {'\uFE0E'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold">{aura.name}</span>
          {aura.adminOnly && (
            <span className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase" style={{ background: accent, color: bg }}>
              Founder
            </span>
          )}
        </span>
        <span className="mt-0.5 block font-mono text-[11px] opacity-60">{aura.id}</span>
        <span className="mt-1 block text-[13px] leading-snug opacity-85">{aura.tagline}</span>
      </span>
      {selected && (
        <span aria-hidden="true" className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full text-[11px]" style={{ background: accent, color: bg }}>
          ✓
        </span>
      )}
    </button>
  )
}

/** Show/hide switches for every panel, plus which one leads the Today screen. Impossible combinations can't be made. */
export function LayoutEditor({ layout, onChange }: { layout: Layout; onChange: (l: Layout) => void }) {
  const toggle = (id: PanelId) => {
    if (REQUIRED.includes(id) || neededBy(id, layout.hidden)) return
    const next = new Set(layout.hidden)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    const hidden = sanitizeHidden([...next])
    onChange({ ...layout, hidden, featured: layout.featured && hidden.includes(layout.featured) ? null : layout.featured })
  }
  const hiddenSet = new Set(layout.hidden)
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {PANELS.map((p) => {
        const on = !hiddenSet.has(p.id)
        const lead = layout.featured === p.id
        const locked = REQUIRED.includes(p.id) ? 'Always on' : neededBy(p.id, layout.hidden) ? `Needed by ${PANELS.find((x) => x.id === neededBy(p.id, layout.hidden))?.label}` : null
        return (
          <li key={p.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                {p.label}
                {lead && <span className="rounded-full bg-surface-2 px-1.5 py-px text-[10px] tracking-wide text-ink-2 uppercase">Leads Today</span>}
                {locked && <span className="rounded-full border border-line px-1.5 py-px text-[10px] tracking-wide text-muted uppercase">{locked}</span>}
              </p>
              <p className="text-[12px] leading-snug text-muted">{p.hint}</p>
            </div>
            {on && !lead && PANEL_TAB[p.id] === 'today' && (
              <button type="button" className="shrink-0 rounded-full px-2 py-1 text-[12px] text-muted hover:text-ink" onClick={() => onChange({ ...layout, featured: p.id })}>
                Put first
              </button>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-disabled={!!locked}
              disabled={!!locked}
              aria-label={`Show ${p.label}`}
              onClick={() => toggle(p.id)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'bg-ink' : 'bg-surface-2 ring-1 ring-line-strong ring-inset'}`}
            >
              <span className={`absolute top-1 left-1 size-5 rounded-full bg-bg shadow transition-transform duration-200 ${on ? 'translate-x-5' : ''}`} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** First-run screen: pick an aura, shape the dashboard, get starter habits. */
export function Onboarding() {
  const { user, engine, backend, state, today } = useStore()
  const { setTheme, setLayout } = useThemeCtx()
  const auras = aurasFor(user.email)
  const [step, setStep] = useState<1 | 2>(1)
  const [draft, setDraft] = useState<Layout | null>(null)
  const hasHabits = state.habits.length > 0
  const [starter, setStarter] = useState(!hasHabits)
  const [busy, setBusy] = useState(false)
  const aura = draft ? AURA_BY_ID[draft.aura] : null

  const pick = (a: Aura) => {
    setDraft(layoutFromAura(a, user.id))
    setTheme(a.theme)
  }

  const finish = async () => {
    if (!draft || !aura) return
    setBusy(true)
    try {
      if (starter && aura.starter.length) engine.commit(await defaultHabitOps(user.id, today, aura.starter))
      await backend.markDefaultsSeeded(user.id).catch(() => {})
    } finally {
      setLayout(draft)
      window.scrollTo({ top: 0 })
    }
  }

  const first = (user.name ?? '').split(/\s+/)[0]

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6">
      <p className="text-[13px] text-muted">Step {step} of 2</p>
      {step === 1 ? (
        <>
          <h1 className="hero-title mt-1 font-display text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[2.5rem]">
            {first ? `Welcome, ${first}.` : 'Welcome.'} Choose your aura.
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-ink-2">
            An aura sets the look, the voice and which panels you see. Tap one to try it on; you can change everything later.
          </p>
          <div role="radiogroup" aria-label="Auras" className="mt-6 grid gap-3 sm:grid-cols-2">
            {auras.map((a) => (
              <AuraCard key={a.id} aura={a} selected={draft?.aura === a.id} onSelect={() => pick(a)} />
            ))}
          </div>
        </>
      ) : (
        draft &&
        aura && (
          <>
            <h1 className="hero-title mt-1 font-display text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[2.5rem]">
              Shape your dashboard.
            </h1>
            <p className="mt-2 max-w-xl text-[15px] text-ink-2">
              {aura.name} starts with these panels. Switch any on or off; find this again under your account menu.
            </p>
            <div className="mt-6">
              <LayoutEditor layout={draft} onChange={setDraft} />
            </div>
            {aura.starter.length > 0 && (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <input type="checkbox" checked={starter} onChange={(e) => setStarter(e.target.checked)} className="mt-1 size-4 accent-current" />
                <span className="min-w-0">
                  <span className="block text-sm text-ink">Add {aura.name} starter habits</span>
                  <span className="block text-[12px] text-muted">{aura.starter.map(([n]) => n).join(' · ')}</span>
                </span>
              </label>
            )}
          </>
        )
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          {step === 2 ? (
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
          ) : (
            <span className="truncate text-[13px] text-muted">{aura ? `${aura.emblem} ${aura.name}` : 'Pick one to continue'}</span>
          )}
          {step === 1 ? (
            <Button variant="primary" size="lg" disabled={!draft} onClick={() => (setStep(2), window.scrollTo({ top: 0 }))}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" size="lg" disabled={busy} onClick={() => void finish()}>
              Enter Stillpoint
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
