import type { ThemeId } from '../themes/registry'
import type { AccentId } from '../state/types'

/** Every section of the dashboard a person can show or hide. */
export type PanelId =
  | 'stats'
  | 'week'
  | 'hunt'
  | 'focus'
  | 'quests'
  | 'chest'
  | 'season'
  | 'pet'
  | 'habits'
  | 'month'
  | 'history'
  | 'calendar'
  | 'notes'
  | 'brain'
  | 'journal'
  | 'meals'
  | 'lifts'
  | 'workouts'
  | 'spending'
  | 'log'
  | 'hero'

export type Tab = 'today' | 'body' | 'notes' | 'money' | 'hero'

export const PANELS: { id: PanelId; label: string; hint: string; tab: Tab }[] = [
  { id: 'habits', label: 'Daily habits', hint: 'Tick off the things you do every day.', tab: 'today' },
  { id: 'chest', label: 'Daily chest', hint: 'A new chest each day, full of finds. Better days, better chests.', tab: 'today' },
  { id: 'season', label: 'Season pass', hint: 'Seven goals per season, a star each, with keepsakes to earn.', tab: 'today' },
  { id: 'pet', label: 'Companion', hint: 'A pet that lives on the screen and reacts to your day.', tab: 'today' },
  { id: 'month', label: 'Month grid', hint: 'The whole month at a glance: habits by day, with weekly colour bands.', tab: 'today' },
  { id: 'stats', label: 'Stats strip', hint: 'Streak, meals and workouts at a glance.', tab: 'today' },
  { id: 'week', label: 'This week', hint: 'Goals you set, plus a recap of the week to share.', tab: 'today' },
  { id: 'hunt', label: 'The hunt', hint: 'Gothic monsters that your effort slays. Loot drops.', tab: 'today' },
  { id: 'focus', label: "Today's focus", hint: 'One habit suggested for right now.', tab: 'today' },
  { id: 'quests', label: 'Daily quests', hint: 'Three small challenges a day for bonus XP.', tab: 'today' },
  { id: 'history', label: 'History', hint: 'The last weeks as a strip of days.', tab: 'today' },
  { id: 'calendar', label: 'Google Calendar', hint: "Today's events, add workouts to your calendar.", tab: 'today' },
  { id: 'notes', label: 'Notes & critical thinking', hint: 'Daily observations and one thing you questioned.', tab: 'notes' },
  { id: 'journal', label: 'Journal', hint: 'A private archive of your thinking and observations, with search.', tab: 'notes' },
  { id: 'brain', label: 'Second brain', hint: 'Linked notes drawn as a neural network inside a brain.', tab: 'notes' },
  { id: 'meals', label: 'Meals', hint: 'Choose 1 to 5 meals a day, with notes.', tab: 'body' },
  { id: 'workouts', label: 'Workouts', hint: 'Four sessions a week.', tab: 'body' },
  { id: 'lifts', label: 'Lifts & PRs', hint: 'Track your best weight per exercise in kg.', tab: 'body' },
  { id: 'spending', label: 'Extra spending', hint: 'Non-essential spending and the monthly total.', tab: 'money' },
  { id: 'log', label: 'Monster log', hint: 'Every monster you have met: lore, region, first and last kill.', tab: 'hero' },
  { id: 'hero', label: 'Hero & achievements', hint: 'Level, class, gear and 338 achievements.', tab: 'hero' },
]
/** Panels that can never be switched off. */
export const REQUIRED: PanelId[] = ['habits']
/** A panel that only makes sense with others on: hunting needs workouts (they strike the weekly boss). */
export const NEEDS: Partial<Record<PanelId, PanelId[]>> = { hunt: ['workouts'] }

/** Drops impossible combinations so no layout can end up broken. */
export function sanitizeHidden(hidden: PanelId[]): PanelId[] {
  const set = new Set(hidden.filter((id) => !REQUIRED.includes(id)))
  if (!set.has('hunt')) for (const need of NEEDS.hunt ?? []) set.delete(need)
  return [...set]
}

/** Which visible panel (if any) is holding this one on. */
export const neededBy = (id: PanelId, hidden: PanelId[]): PanelId | null => {
  const h = new Set(hidden)
  for (const [owner, needs] of Object.entries(NEEDS) as [PanelId, PanelId[]][]) if (!h.has(owner) && needs.includes(id)) return owner
  return null
}

export const PANEL_IDS = PANELS.map((p) => p.id)
export const PANEL_TAB = Object.fromEntries(PANELS.map((p) => [p.id, p.tab])) as Record<PanelId, Tab>
const isPanelId = (v: unknown): v is PanelId => typeof v === 'string' && (PANEL_IDS as string[]).includes(v)

export type AuraId =
  | 'dark-knight'
  | 'painting-fairy'
  | 'money-saver-queen'
  | 'iron-monk'
  | 'candlelit-scholar'
  | 'neon-netrunner'
  | 'quiet-wanderer'
  | 'lord-of-ravenmoor'

export interface Aura {
  id: AuraId
  name: string
  tagline: string
  /** One glyph used as the aura's emblem. */
  emblem: string
  theme: ThemeId
  /** Shown first on the Today screen. */
  featured: PanelId | null
  hidden: PanelId[]
  starter: [string, AccentId][]
  adminOnly?: boolean
}

export const AURAS: Aura[] = [
  {
    id: 'dark-knight',
    name: 'Dark Knight',
    tagline: 'Slay a monster with every habit. Iron, candlelight, loot.',
    emblem: '⚔',
    theme: 'ravenmoor',
    featured: 'hunt',
    hidden: ['calendar'],
    starter: [['Train', 'clay'], ['Cold shower', 'teal'], ['Read 10 pages', 'mauve'], ['Lights out by 23:30', 'dusk']],
  },
  {
    id: 'painting-fairy',
    name: 'Painting Fairy',
    tagline: 'Soft colours, little rituals, a sketchbook kind of day.',
    emblem: '✿',
    theme: 'kawaii',
    featured: null,
    hidden: ['hunt', 'workouts', 'lifts', 'calendar', 'stats'],
    starter: [['Sketch for 15 minutes', 'mauve'], ['Paint something small', 'sand'], ['Walk and collect colours', 'sage'], ['Drink water', 'teal']],
  },
  {
    id: 'money-saver-queen',
    name: 'Money Saver Queen',
    tagline: 'Every shekel kept is a crown jewel. Spending comes first.',
    emblem: '♛',
    theme: 'bullet',
    featured: 'spending',
    hidden: ['hunt', 'workouts', 'lifts', 'brain', 'calendar'],
    starter: [['Log every purchase', 'sand'], ['No-spend day', 'sage'], ['Cook at home', 'clay'], ['Check the budget', 'dusk']],
  },
  {
    id: 'iron-monk',
    name: 'Iron Monk',
    tagline: 'Train, breathe, write one line. Nothing extra.',
    emblem: '☯',
    theme: 'zen',
    featured: 'workouts',
    hidden: ['hunt', 'quests', 'spending', 'brain', 'calendar', 'focus'],
    starter: [['Meditate 10 minutes', 'sage'], ['Stretch', 'teal'], ['Train', 'clay'], ['No phone after 22:00', 'dusk']],
  },
  {
    id: 'candlelit-scholar',
    name: 'Candlelit Scholar',
    tagline: 'Read, question, write it down. A chronicle of the mind.',
    emblem: '✒',
    theme: 'manuscript',
    featured: 'brain',
    hidden: ['hunt', 'workouts', 'lifts', 'spending'],
    starter: [['Read 20 pages', 'mauve'], ['Deep work block', 'dusk'], ['Write one observation', 'sand'], ["Review yesterday's notes", 'sage']],
  },
  {
    id: 'neon-netrunner',
    name: 'Neon Netrunner',
    tagline: 'Everything on, phosphor green, maximum stats.',
    emblem: '⌬',
    theme: 'geek',
    featured: 'quests',
    hidden: [],
    starter: [['Ship one thing', 'teal'], ['Learn something new', 'dusk'], ['Touch grass', 'sage'], ['Inbox zero', 'sand']],
  },
  {
    id: 'quiet-wanderer',
    name: 'Quiet Wanderer',
    tagline: 'Dark, quiet, minimal. Habits and the month, nothing extra.',
    emblem: '◎',
    theme: 'hearth',
    featured: null,
    hidden: ['hunt', 'quests', 'focus', 'calendar', 'history', 'week', 'journal', 'brain', 'lifts'],
    starter: [['Gym', 'clay'], ['Stretch', 'sage'], ['Drink 3L water', 'teal'], ['Cardio', 'dusk']],
  },
  {
    id: 'lord-of-ravenmoor',
    name: 'Lord of Ravenmoor',
    tagline: "The founder's build. Every panel, every monster, every drop.",
    emblem: '♜',
    theme: 'ravenmoor',
    featured: 'hunt',
    hidden: [],
    starter: [],
    adminOnly: true,
  },
]
export const AURA_BY_ID = Object.fromEntries(AURAS.map((a) => [a.id, a])) as Record<AuraId, Aura>
const isAuraId = (v: unknown): v is AuraId => typeof v === 'string' && v in AURA_BY_ID

/** The founder's account. Only decides which presets are offered; data access is enforced by RLS. */
export const ADMIN_EMAIL = 'davislyu@gmail.com'
export const isAdmin = (email: string | null | undefined) => (email ?? '').trim().toLowerCase() === ADMIN_EMAIL

export const aurasFor = (email: string | null | undefined) => AURAS.filter((a) => !a.adminOnly || isAdmin(email))

/** The dashboard is a 12-column grid on wide screens. */
export const GRID_COLS = 12
export const MIN_SPAN = 3
export const MAX_HEIGHT = 1600
export interface PanelSize {
  /** Width in grid columns, 3 to 12. */
  w: number
  /** Minimum height in px; panels never clip, so this only makes them taller. */
  h?: number
}

/** Panels that sit in the narrow side column of the classic layout. */
export const CLASSIC_ASIDE: PanelId[] = ['chest', 'pet', 'hero', 'calendar', 'meals', 'workouts', 'lifts', 'spending']
export const defaultSpan = (id: PanelId) => (id === 'stats' || id === 'month' ? GRID_COLS : CLASSIC_ASIDE.includes(id) ? 4 : 8)

export interface Layout {
  aura: AuraId
  hidden: PanelId[]
  featured: PanelId | null
  /** Set once the person arranges panels by hand: every panel, in reading order. Absent = the classic layout. */
  order?: PanelId[]
  sizes?: Partial<Record<PanelId, PanelSize>>
  /** Account this layout belongs to (guards a shared device). */
  owner: string
}

export const layoutFromAura = (aura: Aura, owner: string): Layout => ({
  aura: aura.id,
  hidden: sanitizeHidden([...aura.hidden]),
  featured: aura.featured,
  owner,
})

const clampSpan = (n: unknown) => Math.min(GRID_COLS, Math.max(MIN_SPAN, Math.round(Number(n) || GRID_COLS)))

/** Valid, de-duplicated order that always lists every panel (new panels join at the end). */
export function normalizeOrder(raw: unknown): PanelId[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const seen = new Set<PanelId>()
  for (const id of raw) if (isPanelId(id)) seen.add(id)
  for (const id of PANEL_IDS) seen.add(id)
  return [...seen]
}
function normalizeSizes(raw: unknown): Layout['sizes'] | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: NonNullable<Layout['sizes']> = {}
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isPanelId(id) || !v || typeof v !== 'object') continue
    const { w, h } = v as { w?: unknown; h?: unknown }
    const height = Number(h)
    out[id] = { w: clampSpan(w), ...(Number.isFinite(height) && height > 0 ? { h: Math.min(MAX_HEIGHT, Math.round(height)) } : {}) }
  }
  return out
}

/**
 * The classic two-column dashboard expressed as a grid: stats across the top, then
 * each wide panel paired with a side panel. This is where hand-arranging starts.
 */
export function arrangementFrom(layout: Layout): Pick<Required<Layout>, 'order' | 'sizes'> {
  const hidden = new Set(layout.hidden)
  const main = (['week', 'hunt', 'focus', 'quests', 'habits', 'month', 'season', 'history', 'notes', 'journal', 'brain'] as PanelId[])
  const side = CLASSIC_ASIDE
  const order: PanelId[] = ['stats']
  const m = main.filter((id) => !hidden.has(id))
  const a = side.filter((id) => !hidden.has(id))
  for (let i = 0; i < Math.max(m.length, a.length); i++) {
    if (m[i]) order.push(m[i])
    if (a[i]) order.push(a[i])
  }
  for (const id of PANEL_IDS) if (!order.includes(id)) order.push(id)
  return { order, sizes: Object.fromEntries(PANEL_IDS.map((id) => [id, { w: defaultSpan(id) }])) }
}

export function normalizeLayout(raw: unknown): Layout | null {
  const r = raw as Partial<Layout> | null
  if (!r || typeof r !== 'object' || !isAuraId(r.aura) || typeof r.owner !== 'string') return null
  return {
    aura: r.aura,
    hidden: Array.isArray(r.hidden) ? sanitizeHidden([...new Set(r.hidden.filter(isPanelId))]) : [],
    featured: isPanelId(r.featured) ? r.featured : null,
    owner: r.owner,
    ...(r.order ? { order: normalizeOrder(r.order) } : {}),
    ...(r.sizes ? { sizes: normalizeSizes(r.sizes) } : {}),
  }
}

/** The mobile tabs that still have something on them. */
export function visibleTabs(layout: Layout | null): Tab[] {
  const hidden = new Set(layout?.hidden ?? [])
  const tabs = new Set<Tab>(['today'])
  for (const p of PANELS) if (!hidden.has(p.id)) tabs.add(p.id === layout?.featured ? 'today' : p.tab)
  return (['today', 'body', 'notes', 'money', 'hero'] as Tab[]).filter((t) => tabs.has(t))
}
