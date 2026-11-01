/**
 * Every theme changes more than colour: typeface, shapes, textures, motion
 * and the app's voice (labels, greetings, achievement callouts). Colours and
 * shapes live in src/themes/css/<id>.css; the voice lives here.
 */

export type ThemeId =
  | 'hearth'
  | 'stillpoint'
  | 'geek'
  | 'bullet'
  | 'synthwave'
  | 'manuscript'
  | 'brutalist'
  | 'pocket'
  | 'zen'
  | 'blueprint'
  | 'retro'
  | 'cottage'
  | 'kawaii'
  | 'abyss'
  | 'ravenmoor'

export interface Vibe {
  /** Rewrites a panel title ("Daily habits" → "~/daily-habits"). */
  title: (t: string) => string
  /** Rewrites the greeting ("Good afternoon" → "> good_afternoon"). */
  greeting: (g: string) => string
  unlocked: string
  levelUp: string
  level: string
  xp: string
  quest: string
  /** Name for the hero/achievements tab. */
  heroTab: string
  slain: string
}

export interface ThemeDef {
  id: ThemeId
  name: string
  tagline: string
  scheme: 'auto' | 'light' | 'dark'
  /** bg, surface, ink, accent: for the picker swatch. */
  swatch: [string, string, string, string]
  vibe: Vibe
}

const same = (s: string) => s
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const base: Vibe = {
  title: same,
  greeting: (g) => `${g}.`,
  unlocked: 'Achievement unlocked',
  levelUp: 'Level up',
  level: 'Level',
  xp: 'XP',
  quest: 'Daily quests',
  heroTab: 'Hero',
  slain: 'Slain',
}

export const THEMES: ThemeDef[] = [
  {
    id: 'hearth',
    name: 'Hearth',
    tagline: 'A cosy night sky. Pixel type, a pet by the fire, tiny stars.',
    scheme: 'dark',
    swatch: ['#1a1430', '#251c42', '#f7efdc', '#ffd37a'],
    vibe: {
      ...base,
      greeting: (g) => `${g}, traveller.`,
      unlocked: 'New keepsake',
      levelUp: 'You grew!',
      quest: "Today's errands",
      heroTab: 'Den',
      slain: 'Banished',
    },
  },
  {
    id: 'ravenmoor',
    name: 'Ravenmoor',
    tagline: 'A gothic keep at night. Iron, candlelight and old blood.',
    scheme: 'dark',
    swatch: ['#0b0a0c', '#1f1b1e', '#e8dfcc', '#b3262a'],
    vibe: {
      ...base,
      title: (t) => t,
      greeting: (g) => `${g}, hunter.`,
      unlocked: 'Feat of arms',
      levelUp: 'Your legend grows',
      level: 'Rank',
      quest: 'Bounties',
      heroTab: 'The Hunter',
      slain: 'Vanquished',
    },
  },
  {
    id: 'stillpoint',
    name: 'Stillpoint',
    tagline: 'Quiet slate. The original.',
    scheme: 'auto',
    swatch: ['#f2f3f2', '#fafbfa', '#1c2024', '#839c8b'],
    vibe: base,
  },
  {
    id: 'geek',
    name: 'Geek',
    tagline: 'Phosphor green on black. Root access to your life.',
    scheme: 'dark',
    swatch: ['#030603', '#060b06', '#39ff6a', '#3ef0ff'],
    vibe: {
      title: (t) => `~/${slug(t)}`,
      greeting: (g) => `> ${g.toLowerCase().replace(/\s+/g, '_')}`,
      unlocked: '[+] achievement_unlocked',
      levelUp: '[!] level_up',
      level: 'lvl',
      xp: 'xp',
      quest: 'cron --daily',
      heroTab: 'whoami',
      slain: 'kill -9: process terminated',
    },
  },
  {
    id: 'bullet',
    name: 'Bullet Journal',
    tagline: 'Dot grid, ballpoint, highlighters. Sketched by hand.',
    scheme: 'light',
    swatch: ['#f6f1e4', '#fffdf6', '#22314f', '#e8c25a'],
    vibe: {
      ...base,
      greeting: (g) => `${g} ~`,
      unlocked: '★ New sticker!',
      levelUp: 'Page turned!',
      level: 'Lv.',
      quest: "Today's to-do",
      heroTab: 'Stickers',
    },
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    tagline: 'Neon sunset, chrome type, 1986 forever.',
    scheme: 'dark',
    swatch: ['#12062b', '#1e0a3c', '#ffe8ff', '#ff3cac'],
    vibe: {
      ...base,
      greeting: (g) => g.toUpperCase(),
      unlocked: 'NEW HIGH SCORE',
      slain: 'K.O.!',
      levelUp: 'STAGE CLEAR',
      level: 'LV',
      quest: 'Missions',
      heroTab: 'Arcade',
    },
  },
  {
    id: 'manuscript',
    name: 'Manuscript',
    tagline: 'Parchment, ink and ornament. A chronicle of days.',
    scheme: 'light',
    swatch: ['#efe3c8', '#f7edd6', '#2b1d0e', '#8c2f2b'],
    vibe: {
      ...base,
      greeting: (g) => `${g}, traveller.`,
      unlocked: 'A deed is recorded',
      slain: 'The beast is vanquished',
      levelUp: 'Thou hast risen',
      level: 'Rank',
      quest: 'Daily oaths',
      heroTab: 'Chronicle',
    },
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    tagline: 'Raw concrete energy. Thick lines, hard shadows.',
    scheme: 'light',
    swatch: ['#efefe9', '#ffffff', '#000000', '#ffe500'],
    vibe: {
      ...base,
      greeting: (g) => `${g.toUpperCase()}.`,
      unlocked: 'UNLOCKED.',
      levelUp: 'LEVEL UP.',
      level: 'LVL',
      quest: 'TODAY',
      heroTab: 'STATS',
    },
  },
  {
    id: 'pocket',
    name: 'Pocket 8-bit',
    tagline: 'Four shades of green. Pixels, chiptune heart.',
    scheme: 'light',
    swatch: ['#9bbc0f', '#8bac0f', '#0f380f', '#306230'],
    vibe: {
      ...base,
      greeting: (g) => `${g.toUpperCase()}, P1!`,
      unlocked: 'ITEM GET!',
      slain: 'ENEMY DEFEATED!',
      levelUp: 'LEVEL UP!',
      level: 'LV',
      quest: 'QUESTS',
      heroTab: 'PLAYER',
    },
  },
  {
    id: 'zen',
    name: 'Zen',
    tagline: 'Washi paper, sumi ink, a single red seal.',
    scheme: 'light',
    swatch: ['#f1efe9', '#faf9f5', '#1b1b1b', '#c8452c'],
    vibe: {
      ...base,
      unlocked: 'A step is taken',
      levelUp: 'A new stage',
      level: 'Stage',
      quest: 'Today’s practice',
      heroTab: 'Path',
    },
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    tagline: 'Drafting grid, white linework, engineered routines.',
    scheme: 'dark',
    swatch: ['#0d3b66', '#114775', '#f2f7ff', '#ffd166'],
    vibe: {
      ...base,
      title: (t) => `SPEC / ${t.toUpperCase()}`,
      greeting: (g) => `${g.toUpperCase()}.`,
      unlocked: 'SPEC MET',
      levelUp: 'REVISION ISSUED',
      level: 'REV',
      quest: 'WORK ORDERS',
      heroTab: 'SPECS',
    },
  },
  {
    id: 'retro',
    name: 'Retro OS',
    tagline: 'Beveled windows on a teal desktop.',
    scheme: 'light',
    swatch: ['#008080', '#c0c0c0', '#000000', '#000080'],
    vibe: {
      ...base,
      title: (t) => `${t}`,
      unlocked: 'Achievement unlocked!',
      levelUp: 'Setup complete: level up',
      level: 'Level',
      quest: 'Scheduled tasks',
      heroTab: 'My Hero',
    },
  },
  {
    id: 'cottage',
    name: 'Cottage',
    tagline: 'Moss, honey and pressed flowers. Slow living.',
    scheme: 'light',
    swatch: ['#eef0e2', '#fbfaf3', '#2f3a28', '#6f8f4e'],
    vibe: {
      ...base,
      greeting: (g) => `${g}, petal.`,
      unlocked: 'A little win ✿',
      levelUp: 'Something bloomed',
      level: 'Season',
      quest: 'Garden chores',
      heroTab: 'Garden',
    },
  },
  {
    id: 'kawaii',
    name: 'Kawaii',
    tagline: 'Pastel stickers, bubbly type, sparkles everywhere.',
    scheme: 'light',
    swatch: ['#fff0f6', '#ffffff', '#5a2a4a', '#ff8fc2'],
    vibe: {
      ...base,
      greeting: (g) => `${g}! ♡`,
      unlocked: 'Yay! New badge ♡',
      slain: 'Bonk! ✧',
      levelUp: 'Level up!! ✧',
      level: 'Lv.',
      quest: 'Daily sparkles',
      heroTab: 'Badges',
    },
  },
  {
    id: 'abyss',
    name: 'Abyss',
    tagline: 'Deep sea dark, bioluminescent glow.',
    scheme: 'dark',
    swatch: ['#020d1a', '#062034', '#d6f6ff', '#3ff3ff'],
    vibe: {
      ...base,
      unlocked: 'Discovery logged',
      levelUp: 'Descending deeper',
      level: 'Depth',
      quest: 'Dives today',
      heroTab: 'Sonar',
    },
  },
]

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<ThemeId, ThemeDef>
export const isThemeId = (v: unknown): v is ThemeId => typeof v === 'string' && v in THEME_BY_ID

const loaders = import.meta.glob('./css/*.css')
/** Theme CSS (and its fonts) is code-split and fetched on first use. */
export async function loadThemeCss(id: ThemeId) {
  await loaders[`./css/${id}.css`]?.()
}
export const loadAllThemeCss = () => Promise.all(THEMES.map((t) => loadThemeCss(t.id)))
