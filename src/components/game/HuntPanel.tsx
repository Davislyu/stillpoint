import { useEffect, useRef, useState } from 'react'
import { SOURCE_LABEL } from '../../game/bestiary'
import type { DamageLine } from '../../game/combat'
import { useGame } from '../../game/GameProvider'
import { ITEM_COLOR } from '../../game/loot'
import { useVibe } from '../../themes/vibe'
import { Panel } from '../ui/Panel'
import { MonsterPortrait } from './MonsterPortrait'

const SOURCE_ICON: Record<DamageLine['source'], string> = {
  habits: '⚔',
  meals: '♨',
  mind: '✎',
  gold: '⛃',
  quests: '✦',
  training: '⚒',
  gear: '⛨',
}

function HpBar({ hp, max, tone = 'var(--accent-clay)' }: { hp: number; max: number; tone?: string }) {
  return (
    <div className="hp-bar relative h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={hp} aria-label="Monster health">
      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(hp / Math.max(1, max)) * 100}%`, background: tone }} />
    </div>
  )
}

/** The day's three monsters and the week's boss, fought with real effort. */
export function HuntPanel() {
  const { game } = useGame()
  const vibe = useVibe()
  const { today, week } = game.combat
  const target = today.fights.find((f) => !f.slain)
  const slain = today.fights.filter((f) => f.slain).length
  const dealt = today.lines.reduce((s, l) => s + l.amount, 0)

  // A floating damage number each time today's damage goes up.
  const prev = useRef(dealt)
  const [hit, setHit] = useState<{ n: number; k: number } | null>(null)
  useEffect(() => {
    if (dealt > prev.current) setHit({ n: dealt - prev.current, k: Date.now() })
    prev.current = dealt
  }, [dealt])

  const loot = [...today.fights, week.fight].filter((f) => f.slain && f.drop)

  return (
    <Panel
      id="hunt"
      title={vibe.title('The hunt')}
      hint={
        slain === 3
          ? 'All three slain. The road is quiet until dawn.'
          : `${slain} of 3 slain today. Every habit, meal and note is a blow.`
      }
    >
      <ol className="mb-4 flex items-center gap-2" aria-label="Today's monsters">
        {today.fights.map((f, i) => (
          <li key={f.key} className={`flex flex-1 items-center gap-2 rounded-xl border px-2 py-1.5 ${f === target ? 'border-line-strong bg-surface-2' : 'border-line'}`}>
            <MonsterPortrait monster={f.monster} size={32} slain={f.slain} />
            <span className={`min-w-0 truncate text-[12px] ${f.slain ? 'text-muted line-through' : 'text-ink-2'}`}>
              {i === 2 ? 'Elite: ' : ''}
              {f.monster.name}
            </span>
          </li>
        ))}
      </ol>

      {target ? (
        <div className="flex gap-4">
          <div className="relative">
            <MonsterPortrait key={`p-${hit?.k ?? 0}`} monster={target.monster} size={104} className={`text-ink ${hit ? 'anim-hit' : ''}`} />
            {hit && (
              <span key={`d-${hit.k}`} className="anim-dmg pointer-events-none absolute -top-1 right-0 font-display text-xl font-semibold text-accent-clay tabular">
                −{Math.round(hit.n)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight font-medium text-ink">{target.monster.name}</p>
            <p className="text-[13px] text-muted">{target.monster.title}</p>
            <div className="mt-2.5">
              <HpBar hp={target.hp} max={target.maxHp} />
              <p className="mt-1 flex justify-between text-[12px] text-muted tabular">
                <span>
                  {target.hp} / {target.maxHp} HP
                </span>
                <span>Weak to {SOURCE_LABEL[target.monster.weakness]}</span>
              </p>
            </div>
            <p className="mt-2 text-[13px] leading-snug text-ink-2 italic">{target.monster.lore}</p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-2">Three monsters fell today. Rest, hunter. New ones gather at dawn.</p>
      )}

      {(today.lines.length > 0 || today.healed > 0) && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Today's blows">
          {today.lines.map((l, i) => (
            <li key={i} className="rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-2 tabular">
              <span aria-hidden="true">{SOURCE_ICON[l.source]} </span>
              {l.label} <span className="text-ink">{Math.round(l.amount)}</span>
            </li>
          ))}
          {today.healed > 0 && (
            <li className="rounded-full border border-dashed border-accent-clay px-2.5 py-1 text-[12px] text-ink-2 tabular" title="Extra spending feeds the first monster">
              Spending fed it <span className="text-accent-clay">+{today.healed} HP</span>
            </li>
          )}
        </ul>
      )}

      {loot.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] text-muted">Loot</p>
          <ul className="flex flex-wrap gap-1.5">
            {loot.map((f) => (
              <li key={f.key} className="rounded-md border px-2 py-1 text-[12px]" style={{ borderColor: ITEM_COLOR[f.drop!.rarity], color: ITEM_COLOR[f.drop!.rarity] }}>
                {f.drop!.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
        <MonsterPortrait monster={week.fight.monster} size={48} slain={week.fight.slain} className="text-ink" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">
            <span className="text-muted">Weekly boss: </span>
            {week.fight.monster.name}, {week.fight.monster.title}
          </p>
          {week.fight.slain ? (
            <p className="text-[12px] text-accent-sand">Defeated this week.{week.fight.drop ? ` Dropped ${week.fight.drop.name}.` : ''}</p>
          ) : (
            <>
              <div className="mt-1.5">
                <HpBar hp={week.fight.hp} max={week.fight.maxHp} tone="var(--accent-sand)" />
              </div>
              <p className="mt-1 text-[12px] text-muted tabular">
                {week.fight.hp} / {week.fight.maxHp} HP. Each workout strikes hard; four fell it.
              </p>
            </>
          )}
        </div>
      </div>
    </Panel>
  )
}
