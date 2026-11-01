import type { ThemeId } from '../themes/registry'
import type { AccentId } from '../state/types'

/** Every section of the dashboard a person can show or hide. */
export type PanelId =
  | 'stats'
  | 'week'
  | 'hunt'
  | 'focus'
  | 'quests'
  | 'habits'
  | 'history'
  | 'calendar'
  | 'notes'
  | 'brain'
  | 'journal'
  | 'meals'
  | 'lifts'
  | 'workouts'
  | 'spending'
  | 'hero'

export type Tab = 'today' | 'body' | 'notes' | 'money' | 'hero'

export const PANELS: { id: PanelId; label: string; hint: string; tab: Tab }[] = [
  { id: 'habits', label: 'Daily habits', hint: 'Tick off the things you do every day.', tab: 'today' },
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
    tagline: 'Calm slate, just the essentials. The original Stillpoint.',
    emblem: '◎',
    theme: 'stillpoint',
    featured: null,
    hidden: ['hunt', 'quests'],
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

export interface Layout {
  aura: AuraId
  hidden: PanelId[]
  featured: PanelId | null
  /** Account this layout belongs to (guards a shared device). */
  owner: string
}

export const layoutFromAura = (aura: Aura, owner: string): Layout => ({
  aura: aura.id,
  hidden: sanitizeHidden([...aura.hidden]),
  featured: aura.featured,
  owner,
})

export function normalizeLayout(raw: unknown): Layout | null {
  const r = raw as Partial<Layout> | null
  if (!r || typeof r !== 'object' || !isAuraId(r.aura) || typeof r.owner !== 'string') return null
  return {
    aura: r.aura,
    hidden: Array.isArray(r.hidden) ? sanitizeHidden([...new Set(r.hidden.filter(isPanelId))]) : [],
    featured: isPanelId(r.featured) ? r.featured : null,
    owner: r.owner,
  }
}

/** The mobile tabs that still have something on them. */
export function visibleTabs(layout: Layout | null): Tab[] {
  const hidden = new Set(layout?.hidden ?? [])
  const tabs = new Set<Tab>(['today'])
  for (const p of PANELS) if (!hidden.has(p.id)) tabs.add(p.id === layout?.featured ? 'today' : p.tab)
  return (['today', 'body', 'notes', 'money', 'hero'] as Tab[]).filter((t) => tabs.has(t))
}
