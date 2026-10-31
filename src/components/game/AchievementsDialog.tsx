import { useEffect, useMemo, useState } from 'react'
import { ACHIEVEMENTS, CATEGORY_LABEL, RARITIES, type Category, type Rarity } from '../../game/achievements'
import { useGame } from '../../game/GameProvider'
import { shortDate } from '../../lib/date'
import { Button } from '../ui/Button'
import { Badge, RARITY_COLOR } from './Badge'

const CATS = Object.keys(CATEGORY_LABEL) as Category[]
type Show = 'all' | 'earned' | 'locked'

export function AchievementsDialog({ onClose }: { onClose: () => void }) {
  const { game } = useGame()
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [show, setShow] = useState<Show>('all')
  const [rarity, setRarity] = useState<Rarity | 'all'>('all')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const list = useMemo(
    () =>
      game.achievements.filter(
        (v) =>
          (cat === 'all' || v.a.category === cat) &&
          (rarity === 'all' || v.a.rarity === rarity) &&
          (show === 'all' || (show === 'earned' ? v.unlocked : !v.unlocked)),
      ),
    [game.achievements, cat, show, rarity],
  )
  const counts = useMemo(() => {
    const c: Record<string, [number, number]> = { all: [game.unlockedCount, ACHIEVEMENTS.length] }
    for (const k of CATS) {
      const items = game.achievements.filter((v) => v.a.category === k)
      c[k] = [items.filter((v) => v.unlocked).length, items.length]
    }
    return c
  }, [game])

  const chip = (on: boolean) =>
    `h-7 shrink-0 rounded-full border px-2.5 text-[12px] transition-colors ${on ? 'border-ink-2 bg-surface-2 text-ink' : 'border-line text-muted hover:text-ink'}`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ach-title"
        onClick={(e) => e.stopPropagation()}
        className="panel anim-rise flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-line bg-bg shadow-2xl sm:rounded-3xl"
      >
        <header className="border-b border-line px-5 pt-5 pb-3 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="ach-title" className="font-display text-2xl font-medium tracking-[-0.02em] text-ink">Achievements</h2>
              <p className="mt-1 text-sm text-muted tabular">
                {game.unlockedCount} of {ACHIEVEMENTS.length} earned, {game.xp.toLocaleString()} XP total
              </p>
            </div>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
          <div className="mt-4 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Category">
            {(['all', ...CATS] as const).map((k) => (
              <button key={k} role="tab" aria-selected={cat === k} className={chip(cat === k)} onClick={() => setCat(k)}>
                {k === 'all' ? 'All' : CATEGORY_LABEL[k]} <span className="tabular opacity-70">{counts[k][0]}/{counts[k][1]}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(['all', 'earned', 'locked'] as Show[]).map((s) => (
              <button key={s} className={chip(show === s)} aria-pressed={show === s} onClick={() => setShow(s)}>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
            <span className="mx-1 w-px bg-line" aria-hidden="true" />
            {(['all', ...RARITIES] as const).map((r) => (
              <button key={r} className={chip(rarity === r)} aria-pressed={rarity === r} onClick={() => setRarity(r)}>
                {r !== 'all' && <span className="mr-1 inline-block size-2 rounded-full" style={{ background: RARITY_COLOR[r] }} />}
                {r === 'all' ? 'Any rarity' : r[0].toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </header>
        <ul className="grid gap-2 overflow-y-auto px-5 py-4 sm:grid-cols-2 sm:px-7">
          {list.map((v) => {
            const secret = v.a.hidden && !v.unlocked
            return (
              <li key={v.a.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${v.unlocked ? 'border-line bg-surface' : 'border-dashed border-line'}`}>
                <Badge rarity={v.a.rarity} category={secret ? 'secret' : v.a.category} locked={!v.unlocked} size={40} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${v.unlocked ? 'text-ink' : 'text-ink-2'}`}>{secret ? '???' : v.a.name}</p>
                  <p className="text-[12px] leading-snug text-muted">{secret ? 'A secret. Keep showing up.' : v.a.description}</p>
                  {!v.unlocked && !secret && (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${v.progress * 100}%`, background: RARITY_COLOR[v.a.rarity] }} />
                    </div>
                  )}
                </div>
                <div className="text-right text-[11px] leading-tight text-muted">
                  <span className="block font-medium tabular" style={{ color: RARITY_COLOR[v.a.rarity] }}>+{v.a.xp}</span>
                  {v.unlocked && v.unlockedOn ? shortDate(v.unlockedOn) : v.a.rarity}
                </div>
              </li>
            )
          })}
          {list.length === 0 && <li className="py-8 text-center text-sm text-muted sm:col-span-2">Nothing matches these filters.</li>}
        </ul>
      </div>
    </div>
  )
}
