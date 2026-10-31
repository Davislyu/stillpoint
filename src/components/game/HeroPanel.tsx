import { useState } from 'react'
import { ATTR_LABEL, nextUp, type Attr } from '../../game/engine'
import { useGame } from '../../game/GameProvider'
import { shortDate } from '../../lib/date'
import { useStore } from '../../state/store'
import { useVibe } from '../../themes/vibe'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { AchievementsDialog } from './AchievementsDialog'
import { Badge, RARITY_COLOR } from './Badge'

/** A class sigil: a ring per ten levels around a glyph. */
function Sigil({ level }: { level: number }) {
  const rings = Math.min(4, 1 + Math.floor(level / 10))
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0 text-ink" aria-hidden="true">
      {Array.from({ length: rings }, (_, i) => (
        <circle key={i} cx="32" cy="32" r={29 - i * 5} fill="none" stroke="currentColor" strokeWidth={i === 0 ? 2 : 1} opacity={1 - i * 0.2} strokeDasharray={i % 2 ? '2 3' : undefined} />
      ))}
      <text x="32" y="38" textAnchor="middle" className="font-display" fontSize="18" fontWeight="600" fill="currentColor">
        {level}
      </text>
    </svg>
  )
}

export function HeroPanel() {
  const { game } = useGame()
  const { user } = useStore()
  const vibe = useVibe()
  const [open, setOpen] = useState(false)
  const pct = (game.level.into / game.level.span) * 100
  const maxAttr = Math.max(1, ...Object.values(game.attrs))
  const recent = game.achievements
    .filter((v) => v.unlocked)
    .sort((a, b) => (b.unlockedOn ?? '9').localeCompare(a.unlockedOn ?? '9') || b.a.xp - a.a.xp)
    .slice(0, 6)
  const upcoming = nextUp(game, 3)

  return (
    <Panel id="hero" title={vibe.heroTab} hint={`${game.unlockedCount} of 300 achievements`}>
      <div className="flex items-center gap-4">
        <Sigil level={game.level.level} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-medium tracking-[-0.01em] text-ink">{user.name ?? 'Adventurer'}</p>
          <p className="text-[13px] text-ink-2">
            {vibe.level} {game.level.level} {game.cls}, {game.title}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={game.level.span} aria-valuenow={game.level.into} aria-label="Progress to next level">
            <div className="h-full rounded-full bg-accent-sand transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[12px] text-muted tabular">
            {game.level.into.toLocaleString()} / {game.level.span.toLocaleString()} {vibe.xp}, {game.level.toNext.toLocaleString()} to go
          </p>
        </div>
      </div>

      <dl className="mt-5 space-y-1.5">
        {(Object.keys(game.attrs) as Attr[]).map((k) => (
          <div key={k} className="flex items-center gap-3 text-[12px]" title={ATTR_LABEL[k]}>
            <dt className="w-8 font-semibold text-ink-2 tabular">{k}</dt>
            <dd className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-ink-2" style={{ width: `${(game.attrs[k] / maxAttr) * 100}%` }} />
            </dd>
            <dd className="w-12 text-right text-muted tabular">{Math.round(game.attrs[k])}</dd>
          </div>
        ))}
      </dl>

      {upcoming.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="mb-2 text-[13px] text-ink-2">Next up</h3>
          <ul className="space-y-2.5">
            {upcoming.map((v) => (
              <li key={v.a.id} className="flex items-center gap-3">
                <Badge rarity={v.a.rarity} category={v.a.category} size={30} locked />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{v.a.name}</p>
                  <p className="truncate text-[12px] text-muted">{v.a.description}</p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${v.progress * 100}%`, background: RARITY_COLOR[v.a.rarity] }} />
                  </div>
                </div>
                <span className="text-[12px] text-muted tabular">+{v.a.xp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="mb-2 text-[13px] text-ink-2">Recently earned</h3>
          <ul className="grid grid-cols-6 gap-1.5">
            {recent.map((v) => (
              <li key={v.a.id} title={`${v.a.name}${v.unlockedOn ? `, ${shortDate(v.unlockedOn)}` : ''}`}>
                <Badge rarity={v.a.rarity} category={v.a.category} size={40} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button className="mt-5 w-full" onClick={() => setOpen(true)}>
        All achievements ({game.unlockedCount}/300)
      </Button>
      {open && <AchievementsDialog onClose={() => setOpen(false)} />}
    </Panel>
  )
}
