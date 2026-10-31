import { greetingFor, longDate } from '../../lib/date'
import { useNow } from '../../hooks/useNow'
import { addDays } from '../../lib/date'
import { activeHabits, completionOn, streakInfo } from '../../state/selectors'
import { useStore } from '../../state/store'
import { useVibe } from '../../themes/vibe'

export function Greeting() {
  const { state, today } = useStore()
  const vibe = useVibe()
  const now = useNow(60_000)
  const { done, total } = completionOn(state, today)
  const left = total - done
  const info = streakInfo(state, today)
  const hasHabits = activeHabits(state, today).length > 0

  let line: string
  if (!hasHabits) line = 'Add a habit below to get started.'
  else if (info.streak === 0 && info.lastBreak && info.lastBreak.date >= addDays(today, -3) && done === 0)
    line = `Welcome back. A new streak starts with one tick. Your best run isn't going anywhere.`
  else if (info.savedDays.includes(addDays(today, -1)) && done === 0)
    line = 'A shield kept your streak alive yesterday. Tick one habit to keep it going.'
  else if (left === 0) line = 'Everything is ticked off today. Enjoy the rest of it.'
  else line = `You have ${left} ${left === 1 ? 'habit' : 'habits'} to tick off today.`

  return (
    <header className="pt-2 pb-1">
      <p className="text-[13px] text-muted">{longDate(today)}</p>
      <h1 className="hero-title mt-1.5 font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.02] font-medium tracking-[-0.04em] text-ink">
        {vibe.greeting(greetingFor(new Date(now)))}
      </h1>
      <p className="mt-2 max-w-[38ch] font-display text-[clamp(1.15rem,2.4vw,1.4rem)] leading-snug tracking-[-0.015em] text-ink-2">
        {line}
      </p>
    </header>
  )
}
