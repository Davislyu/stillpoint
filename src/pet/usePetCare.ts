import { useEffect, useState } from 'react'
import { daysBetween, startOfWeek } from '../lib/date'
import { useGame } from '../game/GameProvider'
import { isRest, workoutsInWeek } from '../state/selectors'
import { useStore } from '../state/store'
import { useSeason } from '../season/SeasonPanel'
import { accessoryFor, careOf, stageFor } from './care'

/** The pet's mood and growth, recomputed every few minutes so it can fall asleep on its own. */
export function usePetCare() {
  const { state, today } = useStore()
  const { game } = useGame()
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 5 * 60_000)
    return () => clearInterval(id)
  }, [])
  const facts = game.stats.days.find((d) => d.date === today)
  const weekStart = startOfWeek(today)
  const weekFraction = (daysBetween(weekStart, today) + hour / 24) / 7
  const care = careOf({
    facts,
    mealsPerDay: state.mealsPerDay,
    workoutsThisWeek: workoutsInWeek(state, weekStart),
    weekFraction,
    hour,
    resting: isRest(state, today),
  })
  const level = game.level.level
  const { season, stars } = useSeason()
  return { care, level, stage: stageFor(level), accessory: accessoryFor(level), charm: stars >= 3 ? season.charm : null }
}
