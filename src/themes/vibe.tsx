import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isThemeId, loadThemeCss, THEME_BY_ID, type ThemeDef, type ThemeId, type Vibe } from './registry'

export type Mode = 'system' | 'light' | 'dark'

export interface Preferences {
  theme: ThemeId
  mode: Mode
  /** Every theme ever applied; feeds a family of achievements. */
  themesTried: ThemeId[]
}

const KEY = 'stillpoint:prefs'
/** While the theme gallery is open, the page itself uses the neutral default so every preview renders true. */
let galleryOpen = false
const LEGACY_MODE_KEY = 'stillpoint:theme'

function load(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (p && isThemeId(p.theme)) {
      return { theme: p.theme, mode: p.mode ?? 'system', themesTried: (p.themesTried ?? []).filter(isThemeId) }
    }
    const legacy = localStorage.getItem(LEGACY_MODE_KEY)
    const mode: Mode = legacy === 'light' || legacy === 'dark' ? legacy : 'system'
    return { theme: 'stillpoint', mode, themesTried: ['stillpoint'] }
  } catch {
    return { theme: 'stillpoint', mode: 'system', themesTried: ['stillpoint'] }
  }
}

export function normalizePrefs(raw: unknown): Partial<Preferences> {
  const r = (raw ?? {}) as Partial<Preferences>
  const out: Partial<Preferences> = {}
  if (isThemeId(r.theme)) out.theme = r.theme
  if (r.mode === 'light' || r.mode === 'dark' || r.mode === 'system') out.mode = r.mode
  if (Array.isArray(r.themesTried)) out.themesTried = r.themesTried.filter(isThemeId)
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
  /** Merge preferences loaded from the account (another device's choice). */
  adopt: (remote: Partial<Preferences>) => void
  /** The signed-in store registers here to save preference changes to the account. */
  setPersist: (fn: ((p: Preferences) => void) | null) => void
  setGalleryOpen: (open: boolean) => void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(load)
  const persist = useRef<((p: Preferences) => void) | null>(null)
  // Latest prefs for callbacks that outlive a render (e.g. the gallery closing).
  const latest = useRef(prefs)
  latest.current = prefs

  useEffect(() => {
    let cancelled = false
    void loadThemeCss(prefs.theme).then(() => !cancelled && apply(prefs))
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
      adopt: (remote) =>
        update(
          (p) => ({
            theme: remote.theme ?? p.theme,
            mode: remote.mode ?? p.mode,
            themesTried: [...new Set([...p.themesTried, ...(remote.themesTried ?? [])])],
          }),
          false,
        ),
      setPersist: (fn) => {
        persist.current = fn
      },
      setGalleryOpen: (open) => {
        galleryOpen = open
        apply(latest.current)
      },
    }),
    [prefs, update],
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
