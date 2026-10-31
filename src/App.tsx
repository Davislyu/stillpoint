import { useEffect, useState } from 'react'
import { MealLog } from './components/body/MealLog'
import { WorkoutTracker } from './components/body/WorkoutTracker'
import { Greeting } from './components/dashboard/Greeting'
import { StatStrip } from './components/dashboard/StatStrip'
import { TodaysFocus } from './components/dashboard/TodaysFocus'
import { HabitList } from './components/habits/HabitList'
import { HistoryStrip } from './components/habits/HistoryStrip'
import { ObservationsHub } from './components/journal/ObservationsHub'
import { Header } from './components/layout/Header'
import { MobileNav, type View } from './components/layout/MobileNav'
import { SpendingLedger } from './components/money/SpendingLedger'
import { Splash } from './auth/AuthGate'
import { CalendarPanel } from './components/calendar/CalendarPanel'
import { Celebration } from './components/game/Celebration'
import { HeroPanel } from './components/game/HeroPanel'
import { QuestBoard } from './components/game/QuestBoard'
import { GameProvider } from './game/GameProvider'
import { useAuthActions } from './auth/authActions'
import { Button } from './components/ui/Button'
import { SyncEngine } from './data/syncEngine'
import { useStore } from './state/store'
import type { DateKey } from './state/types'

/** Show only the active tab's sections on phones; everything on desktop. */
const shown = (view: View, ...tabs: View[]) => (tabs.includes(view) ? '' : 'hidden lg:block')

export default function App() {
  const { today, sync, engine, user } = useStore()
  const { signOut } = useAuthActions()
  const [view, setView] = useState<View>('today')
  const [selectedDay, setSelectedDay] = useState<DateKey>(today)
  const backToToday = () => setSelectedDay(today)


  // Snap back to today after midnight.
  useEffect(() => setSelectedDay(today), [today])

  if (!sync.ready) {
    if (!sync.loadError) return <Splash />
    return (
      <Splash message={sync.loadError}>
        <Button variant="primary" onClick={() => void engine.refresh()}>
          Retry
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            engine.stop()
            SyncEngine.clearDevice(user.id)
            await signOut()
          }}
        >
          Sign out
        </Button>
      </Splash>
    )
  }

  return (
    <GameProvider>
    <div id="top" className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-12">
      <Header
        onHero={() => {
          setView('hero')
          document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      />
      <Celebration />
      <main className="mx-auto mt-6 grid max-w-[1240px] gap-5 px-4 sm:px-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8 lg:px-8">
        <div className="space-y-5">
          <div className={`space-y-5 ${shown(view, 'today')}`}>
            <Greeting />
            <StatStrip />
            <TodaysFocus />
            <QuestBoard />
            <HabitList date={selectedDay} onBackToToday={backToToday} />
            <HistoryStrip selected={selectedDay} onSelect={setSelectedDay} />
          </div>
          <div className={shown(view, 'notes')}>
            <ObservationsHub date={selectedDay} onBackToToday={backToToday} />
          </div>
        </div>

        <aside aria-label="Hero, body and spending" className="space-y-5 lg:pt-2">
          <div className={shown(view, 'hero')}>
            <HeroPanel />
          </div>
          <div className={shown(view, 'today')}>
            <CalendarPanel />
          </div>
          <div className={`space-y-5 ${shown(view, 'body')}`}>
            <MealLog date={selectedDay} onBackToToday={backToToday} />
            <WorkoutTracker />
          </div>
          <div className={shown(view, 'money')}>
            <SpendingLedger />
          </div>
        </aside>
      </main>
      <MobileNav view={view} onChange={setView} />
    </div>
    </GameProvider>
  )
}
