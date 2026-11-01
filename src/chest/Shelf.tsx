import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import { useGame } from '../game/GameProvider'
import { useStore } from '../state/store'
import { CATEGORY_LABEL, RARITIES, RARITY_COLOR, type Category, type Rarity } from './items'

/** Everything you have ever found, newest first. */
export function Shelf({ onClose }: { onClose: () => void }) {
  const { game } = useGame()
  const { today } = useStore()
  const [cat, setCat] = useState<'all' | Category>('all')
  const [rar, setRar] = useState<'all' | Rarity>('all')
  const [q, setQ] = useState('')
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.body.style.overflow = 'hidden'
    addEventListener('keydown', k)
    return () => {
      removeEventListener('keydown', k)
      document.body.style.overflow = ''
    }
  }, [onClose])
  const all = useMemo(() => [...game.chests.found.values()].sort((a, b) => b.first.localeCompare(a.first) || RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity)), [game.chests.found])
  const shown = all.filter((t) => (cat === 'all' || t.category === cat) && (rar === 'all' || t.rarity === rar) && t.name.toLowerCase().includes(q.trim().toLowerCase()))
  const byRarity = Object.fromEntries(RARITIES.map((r) => [r, all.filter((t) => t.rarity === r).length])) as Record<Rarity, number>
  const chip = (on: boolean) => `h-8 shrink-0 rounded-full border-2 px-3 text-[12.5px] ${on ? 'border-accent-sand bg-surface-2 text-ink' : 'border-line text-muted hover:text-ink'}`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="shelf-title" onClick={(e) => e.stopPropagation()} className="sheet anim-rise flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border-2 border-line bg-bg shadow-2xl sm:rounded-3xl">
        <header className="border-b-2 border-line px-5 pt-4 pb-3 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="shelf-title" className="font-display text-2xl text-ink">Treasure shelf</h2>
              <p className="mt-0.5 text-sm text-muted tabular">{all.length} different finds from {game.chests.opened.length} chests.</p>
            </div>
            <Button variant="primary" onClick={onClose}>Done</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
            {RARITIES.map((r) => <span key={r} style={{ color: RARITY_COLOR[r] }}>{r} {byRarity[r]}</span>)}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your finds" aria-label="Search finds" className="field mt-3 h-10 w-full rounded-xl px-3 text-ink placeholder:text-muted" />
          <div className="mt-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <button className={chip(cat === 'all')} onClick={() => setCat('all')}>All</button>
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => <button key={c} className={chip(cat === c)} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</button>)}
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <button className={chip(rar === 'all')} onClick={() => setRar('all')}>Any rarity</button>
            {RARITIES.map((r) => <button key={r} className={chip(rar === r)} onClick={() => setRar(r)}>{r}</button>)}
          </div>
        </header>
        <div className="overflow-y-auto px-5 py-4 sm:px-7">
          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{all.length === 0 ? 'Nothing here yet. Open your first chest.' : 'No finds match.'}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {shown.map((t) => (
                <li key={t.name} className="flex items-center gap-3 rounded-2xl border-2 bg-surface px-3 py-2" style={{ borderColor: RARITY_COLOR[t.rarity] }}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl" aria-hidden="true">{t.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-ink">{t.name}{t.first === today && <span className="ml-1.5 rounded bg-accent-sand px-1 text-[10px] text-bg">NEW</span>}</span>
                    <span className="block truncate text-[11.5px] text-muted italic">{t.flavor}</span>
                  </span>
                  {t.count > 1 && <span className="shrink-0 text-[12px] text-muted tabular">×{t.count}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
