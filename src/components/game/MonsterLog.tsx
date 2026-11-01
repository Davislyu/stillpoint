import { useEffect, useState } from 'react'
import { ALL_MONSTERS, REGIONS, SOURCE_LABEL, type Monster, type RegionId, type Tier } from '../../game/bestiary'
import { useGame } from '../../game/GameProvider'
import { longDate } from '../../lib/date'
import { Panel } from '../ui/Panel'
import { MonsterPortrait } from './MonsterPortrait'

const TIER_LABEL: Record<Tier, string> = { minion: 'Minion', elite: 'Elite', boss: 'Weekly boss' }
const TIER_COLOR: Record<Tier, string> = { minion: 'var(--accent-clay)', elite: 'var(--accent-mauve)', boss: 'var(--accent-sand)' }
const REGION_ORDER: RegionId[] = ['ravenmoor', 'emberfen', 'glasswood', 'frostmere']

/** The hunter's notebook: every monster, what you know about it, and how often it has fallen. */
export function MonsterLogBody() {
  const { game } = useGame()
  const log = game.combat.log
  const [tier, setTier] = useState<'all' | Tier>('all')
  const [open, setOpen] = useState<Monster | null>(null)
  const met = ALL_MONSTERS.filter((m) => log.has(m.id)).length
  const totalKills = [...log.values()].reduce((a, b) => a + b.count, 0)
  const chip = (on: boolean) => `h-8 shrink-0 rounded-full border-2 px-3 text-[12.5px] ${on ? 'border-accent-sand bg-surface-2 text-ink' : 'border-line text-muted hover:text-ink'}`
  const recent = [...log.entries()].sort((a, b) => b[1].last.localeCompare(a[1].last)).slice(0, 3)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-2">
        <span className="tabular"><b className="font-display text-lg text-accent-sand">{met}</b> of {ALL_MONSTERS.length} met</span>
        <span className="tabular"><b className="font-display text-lg text-accent-sand">{totalKills}</b> slain</span>
        {recent.length > 0 && <span className="min-w-0 truncate text-muted">Latest: {recent.map(([id]) => ALL_MONSTERS.find((m) => m.id === id)?.name).join(', ')}</span>}
      </div>
      <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter by tier">
        {(['all', 'minion', 'elite', 'boss'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tier === t} className={chip(tier === t)} onClick={() => setTier(t)}>
            {t === 'all' ? 'All' : t === 'boss' ? 'Bosses' : t === 'elite' ? 'Elites' : 'Minions'}
          </button>
        ))}
      </div>
      {REGION_ORDER.map((r) => {
        const list = ALL_MONSTERS.filter((m) => m.region === r && (tier === 'all' || m.tier === tier))
        if (!list.length) return null
        const known = list.filter((m) => log.has(m.id)).length
        return (
          <section key={r} className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-[15px] text-ink">{REGIONS[r].name}</h3>
              <span className="text-[12px] text-muted tabular">{known}/{list.length}</span>
            </div>
            <p className="text-[12px] text-muted">{REGIONS[r].blurb}</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {list.map((m) => {
                const e = log.get(m.id)
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(m)}
                      className={`flex w-full items-center gap-2.5 rounded-2xl border-2 px-2.5 py-2 text-left transition-colors ${e ? 'border-line bg-bg hover:border-line-strong' : 'border-dashed border-line opacity-80 hover:opacity-100'}`}
                    >
                      <MonsterPortrait monster={m} size={48} hidden={!e} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-ink">{e ? m.name : '???'}</span>
                        <span className="block text-[11px]" style={{ color: e ? TIER_COLOR[m.tier] : 'var(--muted)' }}>
                          {e ? `${TIER_LABEL[m.tier]} · ×${e.count}` : TIER_LABEL[m.tier]}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      {open && <MonsterDetail monster={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function MonsterDetail({ monster: m, onClose }: { monster: Monster; onClose: () => void }) {
  const { game } = useGame()
  const e = game.combat.log.get(m.id)
  useEffect(() => {
    const k = (ev: KeyboardEvent) => ev.key === 'Escape' && (ev.stopPropagation(), onClose())
    addEventListener('keydown', k, true)
    return () => removeEventListener('keydown', k, true)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={e ? m.name : 'Unknown monster'} onClick={(ev) => ev.stopPropagation()} className="sheet anim-rise w-full max-w-md overflow-hidden rounded-t-3xl border-2 border-line bg-bg px-5 pt-4 pb-6 shadow-2xl sm:rounded-3xl sm:pt-6">
        <div className="flex items-start gap-4">
          <div className="grid size-28 shrink-0 place-items-center rounded-2xl border-2 border-line bg-surface">
            <MonsterPortrait monster={m} size={96} hidden={!e} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] tracking-wide uppercase" style={{ color: TIER_COLOR[m.tier] }}>{TIER_LABEL[m.tier]} · {REGIONS[m.region].name}</p>
            <h3 className="font-display text-xl leading-tight text-ink">{e ? m.name : 'An unknown shape'}</h3>
            <p className="text-[13px] text-muted">{e ? m.title : 'Slay it once to learn what it is.'}</p>
          </div>
        </div>
        {e ? (
          <>
            <p className="mt-4 text-[14px] leading-relaxed text-ink-2 italic">{m.lore}</p>
            {m.note && <p className="mt-2 rounded-xl border-2 border-line bg-surface px-3 py-2 text-[13px] leading-snug text-ink-2"><span className="text-accent-sand">Field note · </span>{m.note}</p>}
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[['Slain', `×${e.count}`], ['First', longDate(e.first).replace(/^\w+, /, '')], ['Last', longDate(e.last).replace(/^\w+, /, '')]].map(([k, v]) => (
                <div key={k} className="rounded-xl border-2 border-line bg-surface px-2 py-2">
                  <dt className="text-[11px] text-muted">{k}</dt>
                  <dd className="text-[13px] text-ink tabular">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12.5px] text-muted">Weak to <span className="text-ink-2">{SOURCE_LABEL[m.weakness]}</span>.</p>
          </>
        ) : (
          <p className="mt-4 text-[14px] text-muted">It lurks somewhere in {REGIONS[m.region].name}. {m.tier === 'boss' ? 'Bosses arrive one a week; strike them with workouts.' : 'Keep up your day and it will turn up.'}</p>
        )}
        <button type="button" onClick={onClose} className="btn btn-primary mt-5 h-11 w-full rounded-xl bg-ink text-bg">Close</button>
      </div>
    </div>
  )
}

export function MonsterLogPanel() {
  return (
    <Panel id="log" title="Monster log" hint="Everything you have met in the wild.">
      <MonsterLogBody />
    </Panel>
  )
}
