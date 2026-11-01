import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { normalizeLayout, type Layout } from '../dashboard/layout'
import { normRestDays } from '../state/rest'
import type { RestReason } from '../state/types'
import { isThemeId, loadThemeCss, THEME_BY_ID, type ThemeDef, type ThemeId, type Vibe } from './registry'

export type Mode = 'system' | 'light' | 'dark'

export type Currency = 'ILS' | 'USD'
export const CURRENCIES: { id: Currency; label: string; symbol: string }[] = [
  { id: 'ILS', label: 'Israeli new shekel', symbol: '₪' },
  { id: 'USD', label: 'US dollar', symbol: '$' },
]

export interface WeeklyGoals {
  workouts: number
  habitDays: number
  noSpendDays: number
}
export const DEFAULT_GOALS: WeeklyGoals = { workouts: 4, habitDays: 5, noSpendDays: 3 }

export interface Reminder {
  enabled: boolean
  /** Local time, "HH:MM". */
  time: string
}
export const DEFAULT_REMINDER: Reminder = { enabled: false, time: '20:00' }

const clampInt = (v: unknown, min: number, max: number, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d
const normGoals = (g: unknown): WeeklyGoals => {
  const r = (g ?? {}) as Partial<WeeklyGoals>
  return {
    workouts: clampInt(r.workouts, 1, 4, DEFAULT_GOALS.workouts),
    habitDays: clampInt(r.habitDays, 1, 7, DEFAULT_GOALS.habitDays),
    noSpendDays: clampInt(r.noSpendDays, 0, 7, DEFAULT_GOALS.noSpendDays),
  }
}
const normReminder = (g: unknown): Reminder => {
  const r = (g ?? {}) as Partial<Reminder>
  return { enabled: r.enabled === true, time: typeof r.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) ? r.time : DEFAULT_REMINDER.time }
}

export interface Preferences {
  theme: ThemeId
  mode: Mode
  /** Every theme ever applied; feeds a family of achievements. */
  themesTried: ThemeId[]
  currency: Currency
  /** Gear slot → equipped item id. Missing slots auto-equip the best item. */
  equipped: Record<string, string>
  /** Dashboard layout chosen at onboarding; null until the person picks an aura. */
  layout: Layout | null
  /** Weekly targets the person sets for themselves. */
  goals: WeeklyGoals
  reminder: Reminder
  /** Meals planned per day, 1 to 5. */
  mealsPerDay: number
  /** Days skipped on purpose (sick, holiday...). */
  restDays: Record<string, RestReason>
}

const isCurrency = (v: unknown): v is Currency => v === 'ILS' || v === 'USD'

/** Shekels for anyone in Israel or using Hebrew; dollars otherwise. */
function defaultCurrency(): Currency {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz === 'Asia/Jerusalem' || tz === 'Asia/Tel_Aviv' || navigator.language?.startsWith('he')) return 'ILS'
  } catch {
    /* ignore */
  }
  return 'USD'
}

const KEY = 'stillpoint:prefs'
/** While the theme gallery is open, the page itself uses the neutral default so every preview renders true. */
let galleryOpen = false
const LEGACY_MODE_KEY = 'stillpoint:theme'

function load(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (p && isThemeId(p.theme)) {
      return {
        theme: p.theme,
        mode: p.mode ?? 'system',
        themesTried: (p.themesTried ?? []).filter(isThemeId),
        currency: isCurrency(p.currency) ? p.currency : defaultCurrency(),
        equipped: p.equipped && typeof p.equipped === 'object' ? p.equipped : {},
        layout: normalizeLayout(p.layout),
        goals: normGoals(p.goals),
        reminder: normReminder(p.reminder),
        mealsPerDay: clampInt(p.mealsPerDay, 1, 5, 5),
        restDays: normRestDays(p.restDays),
      }
    }
    const legacy = localStorage.getItem(LEGACY_MODE_KEY)
    const mode: Mode = legacy === 'light' || legacy === 'dark' ? legacy : 'dark'
    return { theme: 'stillpoint', mode, themesTried: ['stillpoint'], currency: defaultCurrency(), equipped: {}, layout: null, goals: DEFAULT_GOALS, reminder: DEFAULT_REMINDER, mealsPerDay: 5, restDays: {} }
  } catch {
    return { theme: 'stillpoint', mode: 'dark', themesTried: ['stillpoint'], currency: 'USD', equipped: {}, layout: null, goals: DEFAULT_GOALS, reminder: DEFAULT_REMINDER, mealsPerDay: 5, restDays: {} }
  }
}

export function normalizePrefs(raw: unknown): Partial<Preferences> {
  const r = (raw ?? {}) as Partial<Preferences>
  const out: Partial<Preferences> = {}
  if (isThemeId(r.theme)) out.theme = r.theme
  if (r.mode === 'light' || r.mode === 'dark' || r.mode === 'system') out.mode = r.mode
  if (Array.isArray(r.themesTried)) out.themesTried = r.themesTried.filter(isThemeId)
  if (isCurrency(r.currency)) out.currency = r.currency
  if (r.equipped && typeof r.equipped === 'object' && !Array.isArray(r.equipped)) {
    out.equipped = Object.fromEntries(Object.entries(r.equipped).filter(([, v]) => typeof v === 'string')) as Record<string, string>
  }
  const layout = normalizeLayout((r as { layout?: unknown }).layout)
  if (layout) out.layout = layout
  if ((r as { goals?: unknown }).goals) out.goals = normGoals((r as { goals?: unknown }).goals)
  if ((r as { reminder?: unknown }).reminder) out.reminder = normReminder((r as { reminder?: unknown }).reminder)
  if (typeof (r as { mealsPerDay?: unknown }).mealsPerDay === 'number') out.mealsPerDay = clampInt((r as { mealsPerDay?: unknown }).mealsPerDay, 1, 5, 5)
  if ((r as { restDays?: unknown }).restDays) out.restDays = normRestDays((r as { restDays?: unknown }).restDays)
  return out
}

function apply(p: Preferences) {
  if (galleryOpen) p = { ...p, theme: 'stillpoint' }
  const def = THEME_BY_ID[p.theme]
  const root = document.documentElement
  const dark =
    def.scheme === 'dark' ||
    (def.scheme === 'auto' &&
      (p.mode === 'dark' || (p.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)))
  root.classList.toggle('dark', dark)
  if (p.theme === 'stillpoint') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', p.theme)
  // theme-color follows the theme's background once its CSS has applied.
  requestAnimationFrame(() => {
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
    if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
  })
}

interface ThemeCtx {
  prefs: Preferences
  def: ThemeDef
  vibe: Vibe
  setTheme: (id: ThemeId) => void
  setMode: (m: Mode) => void
  setCurrency: (c: Currency) => void
  equip: (slot: string, itemId: string | null) => void
  setLayout: (layout: Layout) => void
  setGoals: (goals: WeeklyGoals) => void
  setReminder: (reminder: Reminder) => void
  setMealsPerDay: (n: number) => void
  setRestDays: (days: Record<string, RestReason>) => void
  /** Id of the account whose preferences have been loaded (null before sign-in loads). */
  loadedFor: string | null
  /** Merge preferences loaded from the account (another device's choice). */
  adopt: (remote: Partial<Preferences>, owner: string) => void
  /** The signed-in store registers here to save preference changes to the account. */
  setPersist: (fn: ((p: Preferences) => void) | null) => void
  setGalleryOpen: (open: boolean) => void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(load)
  const persist = useRef<((p: Preferences) => void) | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  // Latest prefs for callbacks that outlive a render (e.g. the gallery closing).
  const latest = useRef(prefs)
  latest.current = prefs

  useEffect(() => {
    let cancelled = false
    void loadThemeCss(prefs.theme).then(() => {
      if (cancelled) return
      apply(prefs)
      // index.html paints the saved theme's colour before first paint; once the theme's own CSS is in, that inline colour must go or it would pin the old background.
      document.documentElement.style.removeProperty('background-color')
    })
    apply(prefs)
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply(prefs)
    mq.addEventListener('change', onChange)
    return () => {
      cancelled = true
      mq.removeEventListener('change', onChange)
    }
  }, [prefs])

  const update = useCallback((fn: (p: Preferences) => Preferences, save = true) => {
    setPrefs((p) => {
      const next = fn(p)
      if (save) persist.current?.(next)
      return next
    })
  }, [])

  const value = useMemo<ThemeCtx>(
    () => ({
      prefs,
      def: THEME_BY_ID[prefs.theme],
      vibe: THEME_BY_ID[prefs.theme].vibe,
      setTheme: (id) =>
        update((p) => ({ ...p, theme: id, themesTried: p.themesTried.includes(id) ? p.themesTried : [...p.themesTried, id] })),
      setMode: (mode) => update((p) => ({ ...p, mode })),
      setCurrency: (currency) => update((p) => ({ ...p, currency })),
      equip: (slot, itemId) =>
        update((p) => {
          const equipped = { ...p.equipped }
          if (itemId) equipped[slot] = itemId
          else delete equipped[slot]
          return { ...p, equipped }
        }),
      setLayout: (layout) => update((p) => ({ ...p, layout })),
      setGoals: (goals) => update((p) => ({ ...p, goals: normGoals(goals) })),
      setReminder: (reminder) => update((p) => ({ ...p, reminder: normReminder(reminder) })),
      setRestDays: (days) => update((p) => ({ ...p, restDays: normRestDays(days) })),
      setMealsPerDay: (n) => update((p) => ({ ...p, mealsPerDay: clampInt(n, 1, 5, 5) })),
      loadedFor,
      adopt: (remote, owner) => {
        setLoadedFor(owner)
        update(
          (p) => ({
            theme: remote.theme ?? p.theme,
            mode: remote.mode ?? p.mode,
            themesTried: [...new Set([...p.themesTried, ...(remote.themesTried ?? [])])],
            currency: remote.currency ?? p.currency,
            equipped: { ...p.equipped, ...(remote.equipped ?? {}) },
            // The account's layout wins; a layout cached on this device only counts if it is this account's.
            layout: remote.layout ?? (p.layout?.owner === owner ? p.layout : null),
            goals: remote.goals ?? p.goals,
            reminder: remote.reminder ?? p.reminder,
            mealsPerDay: remote.mealsPerDay ?? p.mealsPerDay,
            restDays: remote.restDays ?? p.restDays,
          }),
          false,
        )
      },
      setPersist: (fn) => {
        persist.current = fn
      },
      setGalleryOpen: (open) => {
        galleryOpen = open
        apply(latest.current)
      },
    }),
    [prefs, update, loadedFor],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useThemeCtx(): ThemeCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useThemeCtx must be used inside <ThemeProvider>')
  return c
}

/** The current theme's voice. Safe outside the provider (falls back to the default). */
export function useVibe(): Vibe {
  return useContext(Ctx)?.vibe ?? THEME_BY_ID.stillpoint.vibe
}
