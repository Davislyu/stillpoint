import { useMemo } from 'react'
import { Panel } from '../components/ui/Panel'
import { useGame } from '../game/GameProvider'
import { daysBetween, longDate } from '../lib/date'
import { useStore } from '../state/store'
import { REWARDS, seasonOf, starsOf, tracksFor, type Season } from './season'

const SEASON_COLOR = { autumn: 'var(--accent-clay)', winter: 'var(--accent-dusk)', spring: 'var(--accent-mauve)', summer: 'var(--accent-sand)' } as const

export function useSeason() {
  const { state, today } = useStore()
  const { game } = useGame()
  return useMemo(() => {
    const season = seasonOf(today)
    const tracks = tracksFor(season, { days: game.stats.days, workouts: state.workouts, killDays: game.combat.killDates, today })
    return { season, tracks, stars: starsOf(tracks), daysLeft: Math.max(0, daysBetween(today, season.end)) }
  }, [state.workouts, game.stats.days, game.combat.killDates, today])
}

function Star({ on, color }: { on: boolean; color: string }) {
  return (
    <svg viewBox="0 0 16 16" width="20" height="20" className="pixel" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M7 1h2v4h4v2h2v2h-2v2h-2v4h-2v-3H7v3H5v-4H3v-2H1V7h2V5h4z" fill={on ? color : 'var(--surface-2)'} stroke={on ? 'none' : 'var(--line)'} strokeWidth="0.5" />
    </svg>
  )
}

/** A season pass made of seven tracks. Each finished track is a star; stars unlock keepsakes. */
export function SeasonPanel() {
  const { season, tracks, stars, daysLeft } = useSeason()
  const color = SEASON_COLOR[season.id]
  return (
    <Panel id="season" title={`${season.name} ${season.start.slice(0, 4)}`} hint={`${season.blurb} ${daysLeft} days left.`}
      actions={<span className="text-[13px] text-ink-2 tabular" title="Stars earned this season">{stars}/7 ★</span>}>
      <div className="flex gap-1" aria-label={`${stars} of 7 stars`}>
        {tracks.map((t) => <Star key={t.id} on={t.value >= t.goal} color={color} />)}
      </div>
      <ul className="mt-4 space-y-2.5">
        {tracks.map((t) => {
          const p = Math.min(1, t.value / t.goal)
          return (
            <li key={t.id}>
              <div className="flex justify-between gap-3 text-[13px]">
                <span className={p >= 1 ? 'text-ink' : 'text-ink-2'}>{t.label}</span>
                <span className="shrink-0 text-muted tabular">{Math.min(t.value, t.goal)}/{t.goal}</span>
              </div>
              <div className="mt-1 h-2 rounded-[3px] bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={t.goal} aria-valuenow={Math.min(t.value, t.goal)} aria-label={t.label}>
                <div className="h-full rounded-[3px]" style={{ width: `${p * 100}%`, background: color }} />
              </div>
            </li>
          )
        })}
      </ul>
      <ul className="mt-5 grid grid-cols-2 gap-2 border-t-2 border-line pt-4">
        {REWARDS.map((r) => (
          <li key={r.stars} className={`rounded-xl border-2 px-3 py-2 ${stars >= r.stars ? 'border-line bg-bg' : 'border-dashed border-line opacity-70'}`}>
            <p className="text-[11px] text-muted">{r.stars} ★ {stars >= r.stars ? '· earned' : ''}</p>
            <p className="text-[13px] text-ink">{r.label === 'Season title' ? season.title : r.label}</p>
            <p className="text-[11.5px] leading-snug text-muted">{r.blurb}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11.5px] text-muted">Season ends {longDate(season.end)}. Everything here is counted from what you did, so a missed day only means the next one counts.</p>
    </Panel>
  )
}

export type { Season }
