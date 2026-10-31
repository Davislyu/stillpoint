import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { calendarClient, CONNECTED_KEY, TokenExpiredError, type CalEvent, type NewEvent } from '../../calendar/google'
import { useStore } from '../../state/store'
import { activeHabits } from '../../state/selectors'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Field'
import { PlusIcon } from '../ui/Icons'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'

const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
const dayLabel = (d: Date) => {
  const t = new Date()
  const tomorrow = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)
  if (d.toDateString() === t.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

type Phase = 'off' | 'expired' | 'loading' | 'ready'

export function CalendarPanel() {
  const cal = calendarClient()
  const { state, today, user } = useStore()
  const toast = useToast()
  const wasConnected = typeof localStorage !== 'undefined' && localStorage.getItem(CONNECTED_KEY) === '1'
  const [phase, setPhase] = useState<Phase>(cal.hasToken() ? 'loading' : wasConnected ? 'expired' : 'off')
  const [events, setEvents] = useState<CalEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from.getTime() + 3 * 86_400_000)
    try {
      setEvents(await cal.list(from, to))
      setPhase('ready')
      setError(null)
    } catch (e) {
      if (e instanceof TokenExpiredError) setPhase('expired')
      else setError(e instanceof Error ? e.message : 'Calendar failed to load.')
    }
  }, [cal])

  useEffect(() => {
    if (phase === 'loading') void load()
  }, [phase, load])

  const connect = async (consent = false) => {
    setError(null)
    try {
      await cal.connect({ hint: user.email, consent })
      setPhase('loading')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to Google Calendar.')
    }
  }

  if (!cal.configured) {
    return (
      <Panel id="calendar" title="Calendar" hint="Google Calendar isn't set up for this site yet.">
        <p className="text-sm text-muted">
          Add <code className="text-ink-2">VITE_GOOGLE_CLIENT_ID</code> to the environment to show your events and add workouts to your calendar.
        </p>
      </Panel>
    )
  }

  if (phase === 'off' || phase === 'expired') {
    return (
      <Panel id="calendar" title="Calendar" hint={phase === 'off' ? 'See your day and plan workouts in Google Calendar.' : 'Google asks for a quick refresh every hour.'}>
        <Button variant={phase === 'off' ? 'primary' : 'secondary'} className="w-full" onClick={() => connect()}>
          {phase === 'off' ? 'Connect Google Calendar' : 'Refresh calendar'}
        </Button>
        {error && <p role="alert" className="mt-2 text-[13px] text-ink-2">{error}</p>}
        {phase === 'off' && (
          <p className="mt-3 text-[12px] text-muted">Stillpoint can read your events and add new ones. It never edits or deletes events you made elsewhere.</p>
        )}
      </Panel>
    )
  }

  const groups = new Map<string, CalEvent[]>()
  for (const e of events) {
    const k = dayLabel(e.start)
    groups.set(k, [...(groups.get(k) ?? []), e])
  }

  return (
    <Panel
      id="calendar"
      title="Calendar"
      hint={phase === 'loading' ? 'Loading your events…' : `${events.length} ${events.length === 1 ? 'event' : 'events'} in the next 3 days`}
      actions={
        <Button size="sm" variant="ghost" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
          <PlusIcon width={16} height={16} /> Add
        </Button>
      }
    >
      {adding && (
        <AddEventForm
          habits={activeHabits(state, today).map((h) => h.name)}
          today={today}
          onCancel={() => setAdding(false)}
          onAdd={async (e) => {
            try {
              await cal.insert(e)
              toast(`Added "${e.title}" to Google Calendar.`)
              setAdding(false)
              void load()
            } catch (err) {
              if (err instanceof TokenExpiredError) setPhase('expired')
              else setError(err instanceof Error ? err.message : 'Could not add the event.')
            }
          }}
        />
      )}
      {error && <p role="alert" className="mb-2 text-[13px] text-ink-2">{error}</p>}
      {events.length === 0 && phase === 'ready' && <p className="text-sm text-muted">Nothing scheduled. A clear runway.</p>}
      <div className="space-y-4">
        {[...groups.entries()].map(([label, list]) => (
          <div key={label}>
            <h3 className="mb-1.5 text-[12px] text-muted">{label}</h3>
            <ul className="space-y-1">
              {list.map((e) => (
                <li key={e.id} className="flex items-baseline gap-3 text-sm">
                  <span className="min-w-16 shrink-0 whitespace-nowrap text-[12px] text-muted tabular">{e.allDay ? 'All day' : fmtTime(e.start)}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {e.link ? (
                      <a href={e.link} target="_blank" rel="noreferrer" className="hover:underline">
                        {e.title}
                      </a>
                    ) : (
                      e.title
                    )}
                  </span>
                  {e.fromStillpoint && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">Stillpoint</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button
        className="mt-4 text-[12px] text-muted underline-offset-2 hover:text-ink hover:underline"
        onClick={async () => {
          await cal.disconnect()
          setEvents([])
          setPhase('off')
        }}
      >
        Disconnect Google Calendar
      </button>
    </Panel>
  )
}

function AddEventForm({ habits, today, onAdd, onCancel }: { habits: string[]; today: string; onAdd: (e: NewEvent) => void; onCancel: () => void }) {
  const [what, setWhat] = useState('workout')
  const [custom, setCustom] = useState('')
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('18:00')
  const [minutes, setMinutes] = useState(60)
  const [repeat, setRepeat] = useState<NewEvent['repeat']>('none')

  const kind: NewEvent['kind'] = what === 'workout' ? 'workout' : what === 'custom' ? 'custom' : 'habit'
  const title = what === 'workout' ? 'Workout' : what === 'custom' ? custom.trim() : what.replace(/^habit:/, '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title) return
    const [h, m] = time.split(':').map(Number)
    const [y, mo, d] = date.split('-').map(Number)
    onAdd({ title, start: new Date(y, mo - 1, d, h, m), minutes, repeat, kind })
  }

  return (
    <form onSubmit={submit} className="anim-rise mb-4 space-y-3 rounded-xl border border-line bg-bg p-4" aria-label="Add to Google Calendar">
      <Field label="What">
        <Select value={what} onChange={(e) => {
          setWhat(e.target.value)
          if (e.target.value.startsWith('habit:')) { setMinutes(15); setRepeat('daily') }
          if (e.target.value === 'workout') { setMinutes(60); setRepeat('none') }
        }}>
          <option value="workout">Workout</option>
          {habits.map((h) => (
            <option key={h} value={`habit:${h}`}>
              Habit reminder: {h}
            </option>
          ))}
          <option value="custom">Something else…</option>
        </Select>
      </Field>
      {what === 'custom' && (
        <Field label="Title">
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={80} placeholder="Meal prep" autoFocus />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Date">
          <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value || today)} />
        </Field>
        <Field label="Time">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Length">
          <Select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${m / 60} h`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Repeat">
          <Select value={repeat} onChange={(e) => setRepeat(e.target.value as NewEvent['repeat'])}>
            <option value="none">Just once</option>
            <option value="daily">Every day</option>
            <option value="weekly">Every week</option>
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!title}>
          Add to calendar
        </Button>
      </div>
    </form>
  )
}
