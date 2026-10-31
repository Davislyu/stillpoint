import { useGame } from '../../game/GameProvider'
import { useVibe } from '../../themes/vibe'

/** Level and XP at a glance, in the header. Opens the hero panel. */
export function PlayerChip({ onOpen }: { onOpen: () => void }) {
  const { game } = useGame()
  const vibe = useVibe()
  const pct = Math.round((game.level.into / game.level.span) * 100)
  return (
    <button
      onClick={onOpen}
      className="player-chip btn group flex h-8 items-center gap-2 rounded-full border border-line pr-3 pl-2 text-[13px] text-ink-2 hover:text-ink"
      title={`${game.xp.toLocaleString()} ${vibe.xp}. ${game.level.toNext.toLocaleString()} to the next level.`}
    >
      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-semibold text-bg tabular">
        {game.level.level}
      </span>
      <span className="hidden md:inline">{vibe.level} {game.level.level}</span>
      <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <span className="absolute inset-y-0 left-0 rounded-full bg-accent-sand transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </span>
      <span className="sr-only">
        {vibe.level} {game.level.level}, {pct}% to the next level
      </span>
    </button>
  )
}
