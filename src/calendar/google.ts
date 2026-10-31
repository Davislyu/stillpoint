/**
 * Google Calendar via Google Identity Services (token model). Runs entirely in
 * the browser: no server, no client secret. Calendar access is asked for only
 * when you press Connect, separately from signing in. Access tokens last an
 * hour; after that, one tap refreshes silently if you're still signed in to Google.
 */

export const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const TOKEN_KEY = 'stillpoint:gcal-token'
export const CONNECTED_KEY = 'stillpoint:gcal-connected'

export interface CalEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  fromStillpoint: boolean
  link?: string
}

export interface NewEvent {
  title: string
  start: Date
  minutes: number
  repeat: 'none' | 'daily' | 'weekly'
  kind: 'workout' | 'habit' | 'custom'
}

export interface CalendarClient {
  configured: boolean
  /** A valid token is in hand. */
  hasToken: () => boolean
  connect: (opts: { hint?: string; consent?: boolean }) => Promise<void>
  disconnect: () => Promise<void>
  list: (from: Date, to: Date) => Promise<CalEvent[]>
  insert: (e: NewEvent) => Promise<void>
}

export class TokenExpiredError extends Error {}

// ── Google implementation ───────────────────────────────────────────────

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}
interface GoogleOAuth2 {
  initTokenClient: (cfg: {
    client_id: string
    scope: string
    hint?: string
    callback: (r: TokenResponse) => void
    error_callback?: (e: { type: string }) => void
  }) => { requestAccessToken: (o?: { prompt?: string }) => void }
  revoke: (token: string, done?: () => void) => void
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2 } }
  }
}

let gisPromise: Promise<void> | null = null
function loadGis(): Promise<void> {
  gisPromise ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisPromise = null
      reject(new Error('Could not load Google sign-in. Check your connection or ad blocker.'))
    }
    document.head.appendChild(s)
  })
  return gisPromise
}

function readToken(): { value: string; exp: number } | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? 'null')
    return t && t.exp > Date.now() + 30_000 ? t : null
  } catch {
    return null
  }
}

function toEvent(e: Record<string, any>): CalEvent {
  const allDay = !e.start?.dateTime
  return {
    id: e.id,
    title: e.summary ?? '(no title)',
    start: new Date(e.start?.dateTime ?? `${e.start?.date}T00:00:00`),
    end: new Date(e.end?.dateTime ?? `${e.end?.date}T00:00:00`),
    allDay,
    fromStillpoint: !!e.extendedProperties?.private?.stillpoint,
    link: e.htmlLink,
  }
}

const RRULE: Record<NewEvent['repeat'], string[] | undefined> = {
  none: undefined,
  daily: ['RRULE:FREQ=DAILY'],
  weekly: ['RRULE:FREQ=WEEKLY'],
}

export function eventBody(e: NewEvent) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const end = new Date(e.start.getTime() + e.minutes * 60_000)
  const local = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
  }
  return {
    summary: e.title,
    description: 'Planned in Stillpoint.',
    start: { dateTime: local(e.start), timeZone: tz },
    end: { dateTime: local(end), timeZone: tz },
    recurrence: RRULE[e.repeat],
    extendedProperties: { private: { stillpoint: e.kind } },
  }
}

function googleClient(clientId: string): CalendarClient {
  let token = readToken()

  const request = (hint?: string, prompt = '') =>
    new Promise<void>((resolve, reject) => {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: CAL_SCOPE,
        hint,
        callback: (r) => {
          if (r.error || !r.access_token) return reject(new Error(r.error ?? 'No access granted'))
          token = { value: r.access_token, exp: Date.now() + (r.expires_in ?? 3600) * 1000 }
          sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token))
          localStorage.setItem(CONNECTED_KEY, '1')
          resolve()
        },
        error_callback: (e) => reject(new Error(e.type === 'popup_closed' ? 'The Google window was closed.' : 'Google sign-in was blocked. Allow pop-ups for this site.')),
      })
      client.requestAccessToken({ prompt })
    })

  const call = async (url: string, init?: RequestInit) => {
    if (!token || token.exp < Date.now()) throw new TokenExpiredError()
    const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token.value}`, 'Content-Type': 'application/json', ...init?.headers } })
    if (res.status === 401) {
      token = null
      sessionStorage.removeItem(TOKEN_KEY)
      throw new TokenExpiredError()
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error?.message ?? `Google Calendar returned ${res.status}`)
    }
    return res.status === 204 ? null : res.json()
  }

  return {
    configured: true,
    hasToken: () => !!token && token.exp > Date.now(),
    async connect({ hint, consent }) {
      await loadGis()
      await request(hint, consent ? 'consent' : '')
    },
    async disconnect() {
      const t = token?.value
      token = null
      sessionStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(CONNECTED_KEY)
      if (t && window.google) window.google.accounts.oauth2.revoke(t)
    },
    async list(from, to) {
      const q = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        maxResults: '50',
      })
      const data = await call(`${API}?${q}`)
      return (data?.items ?? []).filter((e: any) => e.status !== 'cancelled').map(toEvent)
    },
    async insert(e) {
      await call(API, { method: 'POST', body: JSON.stringify(eventBody(e)) })
    },
  }
}

// ── Fake for end-to-end tests ───────────────────────────────────────────

function memoryClient(): CalendarClient {
  const KEY = 'e2e:calendar'
  const load = (): { title: string; start: string; end: string; sp?: boolean }[] => JSON.parse(localStorage.getItem(KEY) ?? '[]')
  let connected = localStorage.getItem(CONNECTED_KEY) === '1' && sessionStorage.getItem(TOKEN_KEY) === 'fake'
  return {
    configured: true,
    hasToken: () => connected,
    async connect() {
      connected = true
      localStorage.setItem(CONNECTED_KEY, '1')
      sessionStorage.setItem(TOKEN_KEY, 'fake')
      if (!localStorage.getItem(KEY)) {
        const d = new Date()
        d.setHours(10, 0, 0, 0)
        const e = new Date(d.getTime() + 30 * 60_000)
        localStorage.setItem(KEY, JSON.stringify([{ title: 'Team standup', start: d.toISOString(), end: e.toISOString() }]))
      }
    },
    async disconnect() {
      connected = false
      localStorage.removeItem(CONNECTED_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
    },
    async list(from, to) {
      return load()
        .map((e, i) => ({ id: String(i), title: e.title, start: new Date(e.start), end: new Date(e.end), allDay: false, fromStillpoint: !!e.sp }))
        .filter((e) => e.start >= from && e.start < to)
        .sort((a, b) => +a.start - +b.start)
    },
    async insert(e) {
      const all = load()
      all.push({ title: e.title, start: e.start.toISOString(), end: new Date(e.start.getTime() + e.minutes * 60_000).toISOString(), sp: true })
      localStorage.setItem(KEY, JSON.stringify(all))
    },
  }
}

const unconfigured: CalendarClient = {
  configured: false,
  hasToken: () => false,
  connect: async () => {},
  disconnect: async () => {},
  list: async () => [],
  insert: async () => {},
}

let client: CalendarClient | null = null
export function calendarClient(): CalendarClient {
  if (client) return client
  if (import.meta.env.VITE_E2E_MEMORY_BACKEND === 'true') client = memoryClient()
  else if (import.meta.env.VITE_GOOGLE_CLIENT_ID) client = googleClient(import.meta.env.VITE_GOOGLE_CLIENT_ID)
  else client = unconfigured
  return client
}
