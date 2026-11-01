import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
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
import { Onboarding } from './components/dashboard/AuraPicker'
import { arrangementFrom, AURA_BY_ID, isAdmin, layoutFromAura, PANEL_TAB, sanitizeHidden, visibleTabs, type PanelId } from './dashboard/layout'
import { useThemeCtx } from './themes/vibe'
import { SpendingLedger } from './components/money/SpendingLedger'
import { Splash } from './auth/AuthGate'
import { CalendarPanel } from './components/calendar/CalendarPanel'
import { Celebration } from './components/game/Celebration'
import { HeroPanel } from './components/game/HeroPanel'
import { FirstWeek } from './components/dashboard/FirstWeek'
import { useReminder } from './hooks/useReminder'
import { WeekPanel } from './components/dashboard/WeekPanel'
import { JournalPanel } from './components/journal/JournalPanel'
import { ArrangeBar } from './components/dashboard/ArrangeBar'
import { ArrangeGrid } from './components/dashboard/ArrangeGrid'
import { setArranging, useArranging, useMediaQuery } from './hooks/useArrange'
import { BrainPanel } from './components/brain/BrainPanel'
import { LiftTracker } from './components/body/LiftTracker'
import { HuntPanel } from './components/game/HuntPanel'
import { QuestBoard } from './components/game/QuestBoard'
import { GameProvider } from './game/GameProvider'
import { useAuthActions } from './auth/authActions'
import { Button } from './components/ui/Button'
import { SyncEngine } from './data/syncEngine'
import { useStore } from './state/store'
import type { DateKey } from './state/types'

const QuickLog = lazy(() => import('./components/dashboard/QuickLog'))
const MAIN: PanelId[] = ['stats', 'week', 'hunt', 'focus', 'quests', 'habits', 'history', 'notes', 'journal', 'brain']
const ASIDE: PanelId[] = ['hero', 'calendar', 'meals', 'workouts', 'lifts', 'spending']

export default function App() {
  const { today, sync, engine, user } = useStore()
  const { prefs, loadedFor, setLayout } = useThemeCtx()
  const accountLoaded = loadedFor === user.id
  const { signOut } = useAuthActions()
  const [view, setView] = useState<View>('today')
  const [selectedDay, setSelectedDay] = useState<DateKey>(today)
  const backToToday = () => setSelectedDay(today)
  const [quick, setQuick] = useState(false)
  const wide = useMediaQuery('(min-width: 1024px)')
  const arrangingOn = useArranging()
  useReminder()

  // Snap back to today after midnight.
  useEffect(() => setSelectedDay(today), [today])

  // A layout cached on this device for another account never applies.
  const layout = prefs.layout?.owner === user.id ? prefs.layout : null

  // The founder's account gets the founder's build without the onboarding screen.
  const admin = isAdmin(user.email)
  useEffect(() => {
    if (accountLoaded && !layout && admin) setLayout(layoutFromAura(AURA_BY_ID['lord-of-ravenmoor'], user.id))
  }, [accountLoaded, layout, admin, setLayout, user.id])

  // Each tab remembers where you were scrolled, like a native app.
  const scrolls = useRef<Partial<Record<View, number>>>({})
  const pendingScroll = useRef<number | null>(null)
  const changeView = useCallback(
    (v: View) => {
      if (v === view) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      scrolls.current[view] = window.scrollY
      pendingScroll.current = scrolls.current[v] ?? 0
      setView(v)
    },
    [view],
  )
  useLayoutEffect(() => {
    if (pendingScroll.current === null) return
    window.scrollTo({ top: pendingScroll.current })
    pendingScroll.current = null
  }, [view])

  const tabs = visibleTabs(layout)
  // If the active tab disappears (panels hidden), fall back to Today.
  useEffect(() => {
    if (!tabs.includes(view)) setView('today')
  }, [tabs.join(), view]) // eslint-disable-line react-hooks/exhaustive-deps

  // Home-screen shortcuts: /?view=body, /?view=money, /?quick=1
  useEffect(() => {
    if (!sync.ready || !layout) return
    const q = new URLSearchParams(window.location.search)
    const v = q.get('view')
    if (v && (tabs as string[]).includes(v)) setView(v as View)
    if (q.get('quick') === '1') setQuick(true)
    if (v || q.has('quick')) window.history.replaceState(null, '', window.location.pathname)
  }, [sync.ready, !!layout]) // eslint-disable-line react-hooks/exhaustive-deps

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

  if (!layout) {
    // Wait for the account's own preferences before deciding someone is new.
    if (!accountLoaded || admin) return <Splash />
    return <Onboarding />
  }

  const hidden = new Set(sanitizeHidden(layout.hidden))
  const featured = layout.featured && !hidden.has(layout.featured) ? layout.featured : null
  const on = (id: PanelId) => !hidden.has(id) && id !== featured
  /** Phones show one tab at a time; desktop shows everything. */
  const tabOf = (id: PanelId): View => (id === featured ? 'today' : PANEL_TAB[id])
  const wrap = (id: PanelId, node: ReactNode) => (
    <div key={id} className={tabOf(id) === view ? '' : 'hidden lg:block'}>
      {node}
    </div>
  )
  const panel = (id: PanelId): ReactNode => {
    switch (id) {
      case 'stats':
        return <StatStrip />
      case 'week':
        return <WeekPanel />
      case 'hunt':
        return <HuntPanel />
      case 'focus':
        return <TodaysFocus />
      case 'quests':
        return <QuestBoard />
      case 'habits':
        return <HabitList date={selectedDay} onBackToToday={backToToday} />
      case 'history':
        return <HistoryStrip selected={selectedDay} onSelect={setSelectedDay} />
      case 'notes':
        return <ObservationsHub date={selectedDay} onBackToToday={backToToday} />
      case 'meals':
        return <MealLog date={selectedDay} onBackToToday={backToToday} />
      case 'workouts':
        return <WorkoutTracker />
      case 'lifts':
        return <LiftTracker />
      case 'journal':
        return (
          <JournalPanel
            onEdit={
              hidden.has('notes')
                ? undefined
                : (d) => {
                    setSelectedDay(d)
                    requestAnimationFrame(() => document.getElementById('notes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
                  }
            }
          />
        )
      case 'brain':
        return <BrainPanel />
      case 'spending':
        return <SpendingLedger />
      case 'hero':
        return <HeroPanel />
      case 'calendar':
        return <CalendarPanel />
    }
  }
  const asideIds = ASIDE.filter(on)
  const arranged = !!layout.order
  const arranging = arrangingOn && wide && arranged
  const gridIds = (layout.order ?? []).filter((id) => !hidden.has(id))
  const saveArrangement = ({ ids, sizes }: { ids: PanelId[]; sizes: NonNullable<typeof layout.sizes> }) =>
    setLayout({ ...layout, order: [...ids, ...(layout.order ?? []).filter((id) => !ids.includes(id))], sizes })
  const heroOn = !hidden.has('hero')

  return (
    <GameProvider>
      <div id="top" className="min-h-dvh pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-12">
        <Header
          onArrange={
            layout
              ? () => {
                  if (!layout.order) setLayout({ ...layout, ...arrangementFrom(layout) })
                  setArranging(true)
                }
              : undefined
          }
          onHero={
            heroOn
              ? () => {
                  changeView('hero')
                  document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              : undefined
          }
        />
        <Celebration />
        {arranged ? (
          <main className="mx-auto mt-6 max-w-[1240px] px-4 sm:px-6 lg:mt-8 lg:px-8">
            <div className="mb-5 flex flex-col gap-5 lg:mb-6">
              <div className={view === 'today' ? '' : 'hidden lg:block'}>
                <Greeting />
              </div>
              <div className={view === 'today' ? '' : 'hidden'}>
                <FirstWeek />
              </div>
            </div>
            <ArrangeGrid
              ids={gridIds}
              sizes={layout.sizes ?? {}}
              editing={arranging}
              render={panel}
              itemClass={(id) => (tabOf(id) === view ? '' : 'hidden lg:block')}
              onChange={saveArrangement}
            />
          </main>
        ) : (
          <main
            className={`mx-auto mt-6 grid max-w-[1240px] gap-5 px-4 sm:px-6 lg:mt-8 lg:gap-8 lg:px-8 ${asideIds.length ? 'lg:grid-cols-[minmax(0,1fr)_24rem]' : 'lg:max-w-3xl'}`}
          >
            <div className="flex min-w-0 flex-col gap-5">
              <div className={view === 'today' ? '' : 'hidden lg:block'}>
                <Greeting />
              </div>
              <div className={view === 'today' ? '' : 'hidden'}>
                <FirstWeek />
              </div>
              {featured && wrap(featured, panel(featured))}
              {MAIN.filter(on).map((id) => wrap(id, panel(id)))}
            </div>
            {asideIds.length > 0 && (
              <aside aria-label="More panels" className="flex min-w-0 flex-col gap-5 lg:pt-2">
                {asideIds.map((id) => wrap(id, panel(id)))}
              </aside>
            )}
          </main>
        )}
        <button
          type="button"
          onClick={() => setQuick(true)}
          aria-label="Quick log"
          className="btn btn-primary fixed right-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-20 grid size-14 place-items-center rounded-full bg-ink text-2xl text-bg shadow-[0_10px_30px_-8px_rgba(0,0,0,0.55)] transition-transform duration-150 select-none active:scale-90 lg:right-8 lg:bottom-8"
        >
          <span aria-hidden="true" className="-mt-0.5 leading-none">+</span>
        </button>
        {quick && (
          <Suspense fallback={null}>
            <QuickLog
              onClose={() => setQuick(false)}
              onSpend={() => {
                setQuick(false)
                if (!hidden.has('spending')) changeView('money')
              }}
            />
          </Suspense>
        )}
        {arranging && <ArrangeBar onReset={() => (setLayout({ ...layout, order: undefined, sizes: undefined }), setArranging(false))} />}
        <MobileNav view={view} tabs={tabs} onChange={changeView} />
      </div>
    </GameProvider>
  )
}
