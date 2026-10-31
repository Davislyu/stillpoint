import { useEffect } from 'react'
import { CATEGORY_LABEL } from '../../game/achievements'
import { useGame } from '../../game/GameProvider'
import { useVibe } from '../../themes/vibe'
import { ITEM_COLOR } from '../../game/loot'
import { Badge, RARITY_COLOR } from './Badge'
import { MonsterPortrait } from './MonsterPortrait'

/**
 * The one loud moment in a quiet app: an achievement or level-up card that
 * pops in, glows in its rarity colour, and gets out of the way.
 */
export function Celebration() {
  const { queue, dismiss } = useGame()
  const vibe = useVibe()
  const item = queue[0]

  useEffect(() => {
    if (!item) return
    const t = setTimeout(dismiss, item.kind === 'level' ? 4200 : 3400)
    return () => clearTimeout(t)
  }, [item, dismiss])

  if (!item) return null
  const color =
    item.kind === 'level'
      ? 'var(--accent-sand)'
      : item.kind === 'kill'
        ? item.drop
          ? ITEM_COLOR[item.drop.rarity]
          : 'var(--accent-clay)'
        : RARITY_COLOR[item.a.rarity]
  const key = item.kind === 'level' ? `lvl-${item.level}` : item.kind === 'kill' ? `kill-${item.monster.id}-${queue.length}` : item.a.id

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-40 flex justify-center px-4" aria-live="assertive">
      <button
        key={key}
        onClick={dismiss}
        className="celebration anim-pop pointer-events-auto relative flex w-full max-w-sm items-center gap-4 overflow-hidden rounded-2xl border bg-surface px-4 py-3.5 text-left shadow-2xl"
        style={{ borderColor: color, boxShadow: `0 0 0 1px ${color}, 0 18px 50px -12px ${color}` }}
      >
        <span aria-hidden="true" className="celebration-rays absolute -left-10 top-1/2 size-40 -translate-y-1/2 rounded-full opacity-25" style={{ background: `conic-gradient(from 0deg, ${color} 0 10deg, transparent 10deg 30deg, ${color} 30deg 40deg, transparent 40deg 60deg, ${color} 60deg 70deg, transparent 70deg 90deg, ${color} 90deg 100deg, transparent 100deg 120deg, ${color} 120deg 130deg, transparent 130deg 150deg, ${color} 150deg 160deg, transparent 160deg 180deg, ${color} 180deg 190deg, transparent 190deg 210deg, ${color} 210deg 220deg, transparent 220deg 240deg, ${color} 240deg 250deg, transparent 250deg 270deg, ${color} 270deg 280deg, transparent 280deg 300deg, ${color} 300deg 310deg, transparent 310deg 330deg, ${color} 330deg 340deg, transparent 340deg)` }} />
        {item.kind === 'kill' ? (
          <>
            <span className="relative text-ink">
              <MonsterPortrait monster={item.monster} size={56} />
            </span>
            <span className="relative min-w-0">
              <span className="block text-[12px] tracking-wide text-accent-clay">{vibe.slain}</span>
              <span className="block truncate font-display text-lg font-medium text-ink">{item.monster.name}</span>
              <span className="block truncate text-[12px]" style={{ color: item.drop ? color : 'var(--muted)' }}>
                {item.drop ? `Loot: ${item.drop.name}` : 'It dropped nothing this time.'}
              </span>
            </span>
          </>
        ) : item.kind === 'level' ? (
          <>
            <span className="relative grid size-14 shrink-0 place-items-center rounded-full font-display text-2xl font-semibold text-bg" style={{ background: color }}>
              {item.level}
            </span>
            <span className="relative">
              <span className="block text-[12px] tracking-wide text-muted">{vibe.levelUp}</span>
              <span className="block font-display text-xl font-medium text-ink">
                {vibe.level} {item.level}
              </span>
              <span className="block text-[13px] text-ink-2">You are now: {item.title}</span>
            </span>
          </>
        ) : (
          <>
            <span className="relative">
              <Badge rarity={item.a.rarity} category={item.a.category} size={56} />
            </span>
            <span className="relative min-w-0">
              <span className="block text-[12px] tracking-wide" style={{ color }}>
                {vibe.unlocked} ({item.a.rarity})
              </span>
              <span className="block truncate font-display text-lg font-medium text-ink">{item.a.name}</span>
              <span className="block text-[12px] text-muted">
                {CATEGORY_LABEL[item.a.category]}, +{item.a.xp} {vibe.xp}
              </span>
            </span>
          </>
        )}
      </button>
    </div>
  )
}
