import { MonsterLogBody } from './MonsterLog'
import { useEffect, useState } from 'react'
import { ALL_MONSTERS } from '../../game/bestiary'
import { itemScore } from '../../game/combat'
import { useGame } from '../../game/GameProvider'
import { describeAffix, ITEM_COLOR, SLOT_LABEL, SLOTS, type Item, type Slot } from '../../game/loot'
import { shortDate } from '../../lib/date'
import { useThemeCtx } from '../../themes/vibe'
import { Button } from '../ui/Button'

function ItemCard({ item, equipped, onEquip }: { item: Item; equipped: boolean; onEquip?: () => void }) {
  const color = ITEM_COLOR[item.rarity]
  return (
    <li className={`rounded-xl border px-3 py-2.5 ${equipped ? 'bg-surface' : ''}`} style={{ borderColor: equipped ? color : 'var(--line)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" style={{ color }}>
            {item.name}
          </p>
          <p className="text-[12px] text-muted">
            {item.rarity[0].toUpperCase() + item.rarity.slice(1)} {SLOT_LABEL[item.slot].toLowerCase()}, +{item.power} damage a day
          </p>
          {item.affixes.map((a, i) => (
            <p key={i} className="text-[12px] text-ink-2">
              {describeAffix(a)}
            </p>
          ))}
          <p className="mt-0.5 text-[11px] text-muted">Dropped {shortDate(item.date)}</p>
        </div>
        {onEquip &&
          (equipped ? (
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink-2">Equipped</span>
          ) : (
            <Button size="sm" onClick={onEquip}>
              Equip
            </Button>
          ))}
      </div>
    </li>
  )
}

export function ArmoryDialog({ onClose, initialTab = 'gear' }: { onClose: () => void; initialTab?: 'gear' | 'bestiary' }) {
  const { game } = useGame()
  const { equip } = useThemeCtx()
  const [tab, setTab] = useState<'gear' | 'bestiary'>(initialTab)
  const [slot, setSlot] = useState<Slot | 'all'>('all')
  const { inventory, equipped, slainCount } = game.combat

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const items = inventory.filter((i) => slot === 'all' || i.slot === slot).sort((a, b) => itemScore(b) - itemScore(a))
  const chip = (on: boolean) => `h-7 shrink-0 rounded-full border px-2.5 text-[12px] ${on ? 'border-ink-2 bg-surface-2 text-ink' : 'border-line text-muted hover:text-ink'}`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="armory-title"
        onClick={(e) => e.stopPropagation()}
        className="sheet panel anim-rise flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-line bg-bg shadow-2xl sm:rounded-3xl"
      >
        <header className="border-b border-line px-5 pt-5 pb-3 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="armory-title" className="font-display text-xl font-medium sm:text-2xl tracking-[-0.01em] text-ink">
                {tab === 'gear' ? 'Armoury' : 'Bestiary'}
              </h2>
              <p className="mt-1 text-sm text-muted tabular">
                {tab === 'gear'
                  ? `${inventory.length} ${inventory.length === 1 ? "item" : "items"} collected. Gear adds damage from the next blow on; past kills are yours forever.`
                  : `${slainCount.size} of ${ALL_MONSTERS.length} monsters met, ${[...slainCount.values()].reduce((a, b) => a + b, 0)} slain in all.`}
              </p>
            </div>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
          <div className="mt-4 flex gap-1.5" role="tablist">
            <button role="tab" aria-selected={tab === 'gear'} className={chip(tab === 'gear')} onClick={() => setTab('gear')}>
              Gear
            </button>
            <button role="tab" aria-selected={tab === 'bestiary'} className={chip(tab === 'bestiary')} onClick={() => setTab('bestiary')}>
              Bestiary
            </button>
          </div>
        </header>

        {tab === 'gear' ? (
          <div className="overflow-y-auto px-5 py-4 sm:px-7">
            <h3 className="mb-2 text-[13px] text-ink-2">Equipped</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SLOTS.map((s) => {
                const it = equipped[s]
                return (
                  <li key={s} className="rounded-xl border border-line px-3 py-2">
                    <p className="text-[11px] text-muted">{SLOT_LABEL[s]}</p>
                    <p className="truncate text-sm" style={{ color: it ? ITEM_COLOR[it.rarity] : 'var(--muted)' }}>
                      {it ? it.name : 'Empty'}
                    </p>
                  </li>
                )
              })}
            </ul>
            <div className="mt-5 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {(['all', ...SLOTS] as const).map((s) => (
                <button key={s} className={chip(slot === s)} aria-pressed={slot === s} onClick={() => setSlot(s)}>
                  {s === 'all' ? 'All' : SLOT_LABEL[s]}
                </button>
              ))}
            </div>
            {items.length === 0 ? (
              <p className="mt-6 text-center text-sm text-muted">No loot yet. Slay today's monsters: minions drop about 60% of the time, elites and bosses always.</p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {items.map((it) => (
                  <ItemCard key={it.id} item={it} equipped={equipped[it.slot]?.id === it.id} onEquip={() => equip(it.slot, it.id)} />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="overflow-y-auto px-5 py-4 sm:px-7">
            <MonsterLogBody />
          </div>
        )}
      </div>
    </div>
  )
}
