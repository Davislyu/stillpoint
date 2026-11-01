import { lazy, Suspense, useEffect, useState } from 'react'
import { Panel } from '../components/ui/Panel'
import { Button } from '../components/ui/Button'
import { useGame } from '../game/GameProvider'
import { longDate } from '../lib/date'
import { useStore } from '../state/store'
import { chestKey, treasuresOf, TIER_ITEMS, TIER_NAME, tierFor, type ChestTier, type Treasure } from './chest'
import { ChestSprite } from './ChestSprite'
import { RARITY_COLOR } from './items'

const Shelf = lazy(() => import('./Shelf').then((m) => ({ default: m.Shelf })))

export function TreasureCard({ t, delay = 0 }: { t: Treasure; delay?: number }) {
  return (
    <li className="chest-pop flex items-center gap-3 rounded-2xl border-2 bg-bg px-3 py-2.5" style={{ borderColor: RARITY_COLOR[t.rarity], animationDelay: `${delay}ms`, boxShadow: t.rarity === 'legendary' || t.rarity === 'epic' ? `0 0 18px -4px ${RARITY_COLOR[t.rarity]}` : undefined }}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl" aria-hidden="true">{t.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] leading-snug text-ink">{t.name}</span>
        <span className="block text-[11px] tracking-wide uppercase" style={{ color: RARITY_COLOR[t.rarity] }}>{t.rarity}</span>
        <span className="block text-[12px] leading-snug text-muted italic">{t.flavor}</span>
      </span>
      <span className="shrink-0 text-[11px] text-muted tabular">+{t.xp}xp</span>
    </li>
  )
}

/** Today's chest: do one thing to earn it, finish more of the day for a better one. */
export function ChestPanel() {
  const { game } = useGame()
  const { dispatch, today } = useStore()
  const [reveal, setReveal] = useState<{ key: string; items: Treasure[]; tier: ChestTier } | null>(null)
  const [shelf, setShelf] = useState(false)
  const { chests } = game
  const todayFacts = game.stats.days.find((d) => d.date === today)
  const todayWait = chests.waiting.find((w) => w.date === today)
  const catchUp = chests.waiting.filter((w) => w.date !== today)
  const todayOpened = chests.opened.find((o) => o.date === today)
  const projected = tierFor(todayFacts)

  useEffect(() => {
    if (!reveal) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setReveal(null)
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [reveal])

  const open = (date: string, tier: ChestTier) => {
    const key = chestKey(date, tier)
    dispatch({ type: 'milestones/unlock', ids: [key], today })
    setReveal({ key, tier, items: treasuresOf(key) })
  }

  return (
    <Panel id="chest" title="Daily chest" hint={todayOpened ? 'Opened. A new one tomorrow.' : todayWait ? 'Ready to open.' : 'Do one small thing to earn it.'}
      actions={<Button variant="ghost" size="sm" onClick={() => setShelf(true)}>Shelf · {chests.found.size}</Button>}>
      <div className="flex items-center gap-4">
        <div className="grid size-24 shrink-0 place-items-center rounded-2xl border-2 border-line bg-bg">
          <ChestSprite tier={todayOpened?.tier ?? todayWait?.tier ?? projected} open={!!todayOpened} dim={!todayOpened && !todayWait} size={72} className={todayWait ? 'chest-wiggle' : ''} />
        </div>
        <div className="min-w-0 flex-1">
          {todayWait ? (
            <>
              <p className="text-[14px] text-ink">{TIER_NAME[projected]} chest · {TIER_ITEMS[projected]} finds</p>
              <p className="text-[12.5px] leading-snug text-muted">{projected < 2 ? 'Finish every habit before opening for a gilded chest with better odds.' : 'Perfect day. This one is gilded.'}</p>
              <Button variant="primary" className="mt-2" onClick={() => open(today, projected)}>Open chest</Button>
            </>
          ) : todayOpened ? (
            <p className="text-[13px] leading-snug text-ink-2">A {TIER_NAME[todayOpened.tier].toLowerCase()} chest gave you {todayOpened.items.length} things today.</p>
          ) : (
            <p className="text-[13px] leading-snug text-muted">Tick a habit, log a meal or write a line and today's chest unlocks. The better your day, the better the chest.</p>
          )}
        </div>
      </div>
      {todayOpened && (
        <ul className="mt-4 space-y-2">
          {todayOpened.items.map((t) => <TreasureCard key={t.id} t={t} />)}
        </ul>
      )}
      {catchUp.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-line pt-3">
          <span className="text-[12.5px] text-muted">Unopened:</span>
          {catchUp.map((w) => (
            <Button key={w.date} variant="secondary" size="sm" onClick={() => open(w.date, w.tier)}>
              {longDate(w.date).replace(/,.*/, '')} ({TIER_NAME[w.tier].toLowerCase()})
            </Button>
          ))}
        </div>
      )}
      {reveal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setReveal(null)}>
          <div role="dialog" aria-modal="true" aria-label="Chest opened" onClick={(e) => e.stopPropagation()} className="sheet anim-rise w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-line bg-bg px-5 pt-5 pb-6 shadow-2xl sm:rounded-3xl" style={{ maxHeight: '92dvh' }}>
            <div className="flex flex-col items-center">
              <ChestSprite tier={reveal.tier} open size={112} />
              <h3 className="mt-2 font-display text-xl text-ink">{TIER_NAME[reveal.tier]} chest</h3>
            </div>
            <ul className="mt-4 space-y-2">
              {reveal.items.map((t, i) => <TreasureCard key={t.id} t={t} delay={250 + i * 350} />)}
            </ul>
            <Button variant="primary" className="mt-5 w-full" onClick={() => setReveal(null)}>Collect</Button>
          </div>
        </div>
      )}
      {shelf && (
        <Suspense fallback={null}>
          <Shelf onClose={() => setShelf(false)} />
        </Suspense>
      )}
    </Panel>
  )
}
