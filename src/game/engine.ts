/**
 * XP, levels, class and daily quests. All derived; nothing stored but the
 * unlocked achievement IDs.
 */
import { addDays } from '../lib/date'
import type { AppState, DateKey } from '../state/types'
import type { ThemeId } from '../themes/registry'
import { ACHIEVEMENT_BY_ID, ACHIEVEMENTS, isMeta, isReached, progressOf, type Achievement, type GameCtx } from './achievements'
import { computeStats, hash, type DayFacts, type PlayerStats } from './stats'
import { computeCombat, type Combat } from './combat'

// ── Levels ──────────────────────────────────────────────────────────────

/** Total XP needed to reach `level` (level 1 = 0, level 2 = 100, level 10 = 4,500). */
export const xpForLevel = (level: number) => 50 * level * (level - 1)

export function levelFromXp(xp: number) {
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 50)) / 2))
  while (xpForLevel(level + 1) <= xp) level++
  while (level > 1 && xpForLevel(level) > xp) level--
  const floor = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, into: xp - floor, span: next - floor, toNext: next - xp }
}

const TITLES: [number, string][] = [
  [1, 'Wanderer'], [3, 'Initiate'], [5, 'Apprentice'], [8, 'Adept'], [12, 'Journeyman'], [16, 'Veteran'],
  [20, 'Champion'], [25, 'Warden'], [30, 'Paragon'], [40, 'Mythwalker'], [50, 'Ascendant'], [75, 'Eternal'], [100, 'Stillpoint Sage'],
]
export const titleFor = (level: number) => [...TITLES].reverse().find(([l]) => level >= l)![1]

// ── Class ───────────────────────────────────────────────────────────────

export type Attr = 'STR' | 'VIT' | 'DEX' | 'INT' | 'GLD'
export const ATTR_LABEL: Record<Attr, string> = {
  STR: 'Strength (workouts)',
  VIT: 'Vitality (meals)',
  DEX: 'Discipline (habits)',
  INT: 'Intellect (notes)',
  GLD: 'Gold sense (spending)',
}
const CLASS_OF: Record<Attr, string> = { STR: 'Warrior', VIT: 'Ranger', DEX: 'Rogue', INT: 'Mage', GLD: 'Merchant' }

export function attributes(s: PlayerStats): Record<Attr, number> {
  return {
    STR: s.workoutsTotal * 12 + s.fullWeeks * 20,
    VIT: s.mealsLogged * 2 + s.fullMealDays * 4,
    DEX: s.habitTicks * 1.5 + s.perfectDays * 4,
    INT: s.wordsTotal / 15 + s.criticalEntries * 6,
    GLD: s.noSpendDays * 2 + s.monthsImproved * 40 + s.spendLogged,
  }
}

export function classFor(attrs: Record<Attr, number>): string {
  const sorted = (Object.entries(attrs) as [Attr, number][]).sort((a, b) => b[1] - a[1])
  if (sorted[0][1] === 0) return 'Adventurer'
  // A close second makes a hybrid class.
  if (sorted[1][1] > 0 && sorted[1][1] >= sorted[0][1] * 0.8) {
    const pair = [sorted[0][0], sorted[1][0]].sort().join('+')
    const HYBRID: Record<string, string> = {
      'DEX+STR': 'Monk', 'INT+STR': 'Spellblade', 'STR+VIT': 'Paladin', 'GLD+STR': 'Mercenary',
      'DEX+VIT': 'Druid', 'DEX+INT': 'Sage', 'DEX+GLD': 'Thief', 'INT+VIT': 'Alchemist',
      'GLD+INT': 'Scholar', 'GLD+VIT': 'Innkeeper',
    }
    return HYBRID[pair] ?? CLASS_OF[sorted[0][0]]
  }
  return CLASS_OF[sorted[0][0]]
}

// ── Daily quests ────────────────────────────────────────────────────────

export interface QuestDef {
  id: string
  label: string
  xp: number
  done: (f: DayFacts) => boolean
  /** Can only be confirmed once the day is over (e.g. "no extras today"). */
  endOfDay?: boolean
}

const QUEST_GROUPS: QuestDef[][] = [
  [
    { id: 'tick3', label: 'Tick 3 habits', xp: 30, done: (f) => f.habitsDone >= 3 },
    { id: 'half', label: 'Get to half your habits', xp: 30, done: (f) => f.share !== null && f.share >= 0.5 },
    { id: 'perfect', label: 'Finish every habit', xp: 45, done: (f) => f.share === 1 },
  ],
  [
    { id: 'meals3', label: 'Eat most of your meals', xp: 30, done: (f) => f.meals >= Math.max(1, Math.ceil(f.mealTarget * 0.6)) },
    { id: 'meals5', label: 'Eat every planned meal', xp: 45, done: (f) => f.fullMeals },
    { id: 'mealnote', label: 'Add a note to a meal or two', xp: 30, done: (f) => f.mealNotes >= Math.min(2, f.mealTarget) },
  ],
  [
    { id: 'words50', label: 'Write 50 words under Thinking and observations', xp: 30, done: (f) => f.noteWords >= 50 },
    { id: 'critical', label: 'Fill in Extra Critical Thinking', xp: 30, done: (f) => f.hasCritical },
    { id: 'nospend', label: 'No extra spending today', xp: 30, done: (f) => f.spendCount === 0, endOfDay: true },
  ],
]

/** Three quests per day, one from each group, picked deterministically from the date. */
export const questsFor = (date: DateKey): QuestDef[] =>
  QUEST_GROUPS.map((g, i) => g[hash(`${date}:${i}`) % g.length])

export interface QuestResult {
  quest: QuestDef
  done: boolean
  /** End-of-day quest still on track today. */
  pending: boolean
}

export function questResults(f: DayFacts, today: DateKey): QuestResult[] {
  return questsFor(f.date).map((q) => {
    const ok = q.done(f)
    if (q.endOfDay && f.date === today) return { quest: q, done: false, pending: ok }
    return { quest: q, done: ok, pending: false }
  })
}

// ── Putting it together ─────────────────────────────────────────────────

export interface AchievementView {
  a: Achievement
  unlocked: boolean
  unlockedOn?: DateKey
  /** Met right now but not yet saved. */
  fresh: boolean
  progress: number
}

export interface GameState {
  stats: PlayerStats
  xp: number
  activityXp: number
  level: ReturnType<typeof levelFromXp>
  title: string
  cls: string
  attrs: Record<Attr, number>
  todayQuests: QuestResult[]
  questsCompleted: number
  boardsCleared: number
  achievements: AchievementView[]
  unlockedCount: number
  freshIds: string[]
  combat: Combat
}

export function computeGame(state: AppState, today: DateKey, themesTried: ThemeId[], equippedIds: Record<string, string> = {}): GameState {
  const stats = computeStats(state, today)

  let questsCompleted = 0
  let boardsCleared = 0
  let wordsXp = 0
  let bodyAndSoulDays = 0
  const questsDoneByDay = new Map<DateKey, number>()
  for (const f of stats.days) {
    const r = questResults(f, today)
    const done = r.filter((x) => x.done).length
    questsDoneByDay.set(f.date, done)
    questsCompleted += done
    if (done === 3) boardsCleared++
    wordsXp += Math.min(100, Math.floor(f.noteWords / 10))
    if (f.fullMeals && f.share === 1) bodyAndSoulDays++
  }
  const todayFacts = stats.days.find((d) => d.date === today)
  const todayQuests = todayFacts
    ? questResults(todayFacts, today)
    : questsFor(today).map((quest) => ({ quest, done: false, pending: !!quest.endOfDay }))

  const questXp = stats.days.reduce(
    (sum, f) => sum + questResults(f, today).reduce((s, r) => s + (r.done ? r.quest.xp : 0), 0),
    0,
  )
  const activityXp =
    stats.habitTicks * 10 +
    stats.perfectDays * 25 +
    stats.mealsLogged * 5 +
    stats.fullMealDays * 15 +
    stats.workoutsTotal * 50 +
    stats.fullWeeks * 60 +
    stats.noteDays * 20 +
    stats.criticalEntries * 15 +
    wordsXp +
    stats.spendLogged * 2 +
    stats.monthsImproved * 150 +
    questXp +
    boardsCleared * 50

  const combat = computeCombat({ state, today, stats, questsDoneByDay, equippedIds })
  const allItems = combat.inventory

  const tickCache = new Map<string, number>()
  const habitTicksByName = (re: RegExp) => {
    const k = re.source
    if (!tickCache.has(k)) {
      const ids = new Set(state.habits.filter((h) => re.test(h.name)).map((h) => h.id))
      let count = 0
      for (const list of Object.values(state.completions)) for (const id of list) if (ids.has(id)) count++
      tickCache.set(k, count)
    }
    return tickCache.get(k)!
  }

  const saved = state.milestones
  const base: Omit<GameCtx, 'level' | 'totalXp' | 'unlockedCount'> = {
    stats, themesTried, questsCompleted, boardsCleared, habitTicksByName, bodyAndSoulDays,
    hunt: {
      kills: combat.kills.minion + combat.kills.elite + combat.kills.boss,
      elites: combat.kills.elite,
      bosses: combat.kills.boss,
      bossKinds: combat.bossKinds,
      items: allItems.length,
      epics: allItems.filter((i) => i.rarity === 'epic').length,
      legendaries: allItems.filter((i) => i.rarity === 'legendary').length,
    },
  }

  // Pass 1: everything that doesn't depend on XP itself.
  const provisional = { ...base, level: 1, totalXp: 0, unlockedCount: 0 }
  const reached = new Set<string>()
  for (const a of ACHIEVEMENTS) if (!isMeta(a) && (saved[a.id] || isReached(a, provisional))) reached.add(a.id)
  for (const id of Object.keys(saved)) if (ACHIEVEMENT_BY_ID.has(id)) reached.add(id)

  // Pass 2: XP from activity + achievements, then the meta achievements (level, XP, collector).
  const sumXp = () => [...reached].reduce((s, id) => s + (ACHIEVEMENT_BY_ID.get(id)?.xp ?? 0), 0)
  let xp = activityXp + combat.killXp + sumXp()
  for (let i = 0; i < 4; i++) {
    const ctx: GameCtx = { ...base, level: levelFromXp(xp).level, totalXp: xp, unlockedCount: reached.size }
    let added = false
    for (const a of ACHIEVEMENTS) {
      if (isMeta(a) && !reached.has(a.id) && isReached(a, ctx)) {
        reached.add(a.id)
        added = true
      }
    }
    xp = activityXp + combat.killXp + sumXp()
    if (!added) break
  }

  const level = levelFromXp(xp)
  const finalCtx: GameCtx = { ...base, level: level.level, totalXp: xp, unlockedCount: reached.size }
  const attrs = attributes(stats)
  const achievements: AchievementView[] = ACHIEVEMENTS.map((a) => ({
    a,
    unlocked: reached.has(a.id),
    unlockedOn: saved[a.id],
    fresh: reached.has(a.id) && !saved[a.id],
    progress: reached.has(a.id) ? 1 : progressOf(a, finalCtx),
  }))

  return {
    stats,
    xp,
    activityXp: activityXp + combat.killXp,
    level,
    title: titleFor(level.level),
    cls: classFor(attrs),
    attrs,
    todayQuests,
    questsCompleted,
    boardsCleared,
    achievements,
    unlockedCount: reached.size,
    freshIds: achievements.filter((v) => v.fresh).map((v) => v.a.id),
    combat,
  }
}

/** The next few achievements you're closest to, for the "next up" list. */
export function nextUp(g: GameState, count = 3): AchievementView[] {
  return g.achievements
    .filter((v) => !v.unlocked && !v.a.hidden && v.progress > 0)
    .sort((a, b) => b.progress - a.progress || a.a.xp - b.a.xp)
    .slice(0, count)
}

export const dayBefore = (d: DateKey) => addDays(d, -1)
