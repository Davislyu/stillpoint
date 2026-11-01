/**
 * The daily hunt. Each day three monsters stalk you (two minions, then an
 * elite); each week a boss. Real effort is the only weapon:
 *
 *   habits → steel, meals → stamina, notes → spells, a closed purse → gold,
 *   finished quests and new feats → resolve, workouts → the weekly boss.
 *
 * Extra spending feeds the day's first monster (it heals). Missed days never
 * hurt you: monsters simply go unslain. Kills are saved once earned (as
 * `kill-…`/`boss-…` keys in the milestones table) so loot is permanent,
 * and every item is regenerated from its kill's seed.
 */
import { addDays, daysBetween, startOfWeek } from '../lib/date'
import type { AppState, DateKey } from '../state/types'
import { ACHIEVEMENT_BY_ID, RARITY_XP } from './achievements'
import { BOSSES, ELITES, MINIONS, MONSTER_BY_ID, type Monster, type Source, type Tier } from './bestiary'
import { rollDrop, SLOTS, type Item, type Slot } from './loot'
import { hash, type DayFacts, type PlayerStats } from './stats'

export const MINION_HP = 40
export const ELITE_HP = 100
export const BOSS_HP = 1000
export const KILL_XP: Record<Tier, number> = { minion: 25, elite: 60, boss: 300 }
const WEAKNESS = 1.5

export interface DamageLine {
  source: Source | 'gear'
  label: string
  amount: number
}

export interface Fight {
  monster: Monster
  key: string
  maxHp: number
  /** HP left after today's blows (0 when slain). */
  hp: number
  slain: boolean
  /** Saved earlier, so permanent. */
  saved: boolean
  drop: Item | null
}

export interface DayHunt {
  date: DateKey
  fights: Fight[]
  lines: DamageLine[]
  /** HP your extra spending gave back to the first monster. */
  healed: number
  overflow: number
}

export interface BossHunt {
  weekStart: DateKey
  fight: Fight
  workoutHits: number
  overflowDamage: number
}

export interface Combat {
  today: DayHunt
  week: BossHunt
  inventory: Item[]
  equipped: Partial<Record<Slot, Item>>
  /** Kill keys reached now but not yet saved. */
  freshKills: string[]
  killXp: number
  kills: { minion: number; elite: number; boss: number }
  bossKinds: Set<string>
  slainCount: Map<string, number>
}

const scaleFor = (firstDay: DateKey | null, date: DateKey) =>
  Math.min(2, 1 + 0.03 * Math.floor(Math.max(0, firstDay ? daysBetween(firstDay, date) : 0) / 7))

export function monstersFor(date: DateKey): [Monster, Monster, Monster] {
  const a = MINIONS[hash(`${date}:m0`) % MINIONS.length]
  let b = MINIONS[hash(`${date}:m1`) % MINIONS.length]
  if (b.id === a.id) b = MINIONS[(MINIONS.indexOf(a) + 1) % MINIONS.length]
  return [a, b, ELITES[hash(`${date}:e`) % ELITES.length]]
}
export const bossFor = (weekStart: DateKey): Monster => BOSSES[hash(`${weekStart}:boss`) % BOSSES.length]

/** Which monster a saved kill key refers to. */
export function monsterOfKill(key: string): Monster | undefined {
  const m = key.match(/^kill-(\d{4}-\d{2}-\d{2})-(\d)$/)
  if (m) return monstersFor(m[1])[Number(m[2])]
  const b = key.match(/^boss-(\d{4}-\d{2}-\d{2})$/)
  return b ? bossFor(b[1]) : undefined
}
const tierOfKill = (key: string): Tier => (key.startsWith('boss-') ? 'boss' : key.endsWith('-2') ? 'elite' : 'minion')
const dateOfKill = (key: string) => key.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ''
export const isKillKey = (key: string) => /^(kill-\d{4}-\d{2}-\d{2}-\d|boss-\d{4}-\d{2}-\d{2})$/.test(key)

/** Raw damage a day's facts produce, before weakness and gear. */
export function damageLines(f: DayFacts, today: DateKey, questsDone: number, feats: number, gearPower: number): DamageLine[] {
  const lines: DamageLine[] = []
  if (f.habitsDone) lines.push({ source: 'habits', label: `Habits ×${f.habitsDone}`, amount: f.habitsDone * 15 })
  if (f.share === 1) lines.push({ source: 'habits', label: 'Perfect day', amount: 30 })
  if (f.meals) lines.push({ source: 'meals', label: `Meals ×${f.meals}`, amount: f.meals * 6 + (f.fullMeals ? 20 : 0) })
  const mind = Math.min(40, Math.floor(f.noteWords / 4)) + (f.hasCritical ? 15 : 0)
  if (mind) lines.push({ source: 'mind', label: 'Notes', amount: mind })
  if (f.date < today && f.active && f.spendCount === 0) lines.push({ source: 'gold', label: 'Purse kept shut', amount: 20 })
  if (questsDone) lines.push({ source: 'quests', label: `Quests ×${questsDone}`, amount: questsDone * 15 })
  if (feats) lines.push({ source: 'quests', label: 'New feats', amount: feats })
  if (f.active && gearPower) lines.push({ source: 'gear', label: 'Your gear', amount: gearPower })
  return lines
}

type Mult = (src: DamageLine['source'], m: Monster) => number

/** Applies pooled damage to monsters in order, honouring each one's weakness. */
function resolve(lines: DamageLine[], hps: number[], monsters: Monster[], mult: Mult) {
  const raw = new Map<DamageLine['source'], number>()
  for (const l of lines) raw.set(l.source, (raw.get(l.source) ?? 0) + l.amount)
  const left = [...hps]
  for (let i = 0; i < monsters.length; i++) {
    let effective = 0
    for (const [src, amt] of raw) effective += amt * mult(src, monsters[i])
    if (effective <= 0) break
    if (effective >= left[i]) {
      const used = left[i] / effective
      for (const [src, amt] of raw) raw.set(src, amt * (1 - used))
      left[i] = 0
    } else {
      left[i] -= effective
      raw.clear()
      break
    }
  }
  let overflow = 0
  for (const [, amt] of raw) overflow += amt
  return { left, overflow }
}

export interface CombatInput {
  state: AppState
  today: DateKey
  stats: PlayerStats
  questsDoneByDay: Map<DateKey, number>
  equippedIds: Record<string, string>
}

export function computeCombat({ state, today, stats, questsDoneByDay, equippedIds }: CombatInput): Combat {
  const saved = state.milestones
  const savedKills = Object.keys(saved).filter(isKillKey)

  // Inventory so far (from saved kills) decides today's gear.
  const itemsFrom = (keys: string[]) =>
    keys.map((k) => rollDrop(k, tierOfKill(k), dateOfKill(k))).filter((x): x is Item => !!x)
  const savedItems = itemsFrom(savedKills)
  const equipped = equip(savedItems, equippedIds)
  const gear = Object.values(equipped).filter(Boolean) as Item[]
  const gearPower = gear.reduce((s, i) => s + i.power, 0)
  const gearPct = (src: DamageLine['source']) =>
    src === 'gear' ? 0 : gear.reduce((s, i) => s + i.affixes.filter((a) => a.source === src || a.source === 'all').reduce((x, a) => x + a.pct, 0), 0)
  const mult: Mult = (src, m) => (1 + gearPct(src)) * (src !== 'gear' && m.weakness === src ? WEAKNESS : 1)

  // Feats (achievements) earned per day, weighted by rarity.
  const featsByDay = new Map<DateKey, number>()
  for (const [id, day] of Object.entries(saved)) {
    const a = ACHIEVEMENT_BY_ID.get(id)
    if (a) featsByDay.set(day, (featsByDay.get(day) ?? 0) + Math.round(RARITY_XP[a.rarity] / 5))
  }
  const spendByDay = new Map<DateKey, number>()
  for (const s of state.spendings) if (!s.justified) spendByDay.set(s.date, (spendByDay.get(s.date) ?? 0) + 1)

  const fresh: string[] = []
  const overflowByWeek = new Map<DateKey, number>()
  let todayHunt: DayHunt | null = null

  const facts = stats.days.length ? stats.days : []
  for (const f of facts) {
    const mons = monstersFor(f.date)
    const s = scaleFor(stats.firstDay, f.date)
    const hps = [Math.round(MINION_HP * s), Math.round(MINION_HP * s), Math.round(ELITE_HP * s)]
    const healed = Math.min(40, (spendByDay.get(f.date) ?? 0) * 8)
    const start = [hps[0] + healed, hps[1], hps[2]]
    const lines = damageLines(f, today, questsDoneByDay.get(f.date) ?? 0, featsByDay.get(f.date) ?? 0, gearPower)
    const { left, overflow } = resolve(lines, start, mons, mult)
    const ws = startOfWeek(f.date)
    overflowByWeek.set(ws, (overflowByWeek.get(ws) ?? 0) + overflow)
    const fights: Fight[] = mons.map((m, i) => {
      const key = `kill-${f.date}-${i}`
      const isSaved = !!saved[key]
      const slain = isSaved || left[i] === 0
      if (slain && !isSaved) fresh.push(key)
      return { monster: m, key, maxHp: start[i], hp: slain ? 0 : Math.round(left[i]), slain, saved: isSaved, drop: slain ? rollDrop(key, m.tier, f.date) : null }
    })
    if (f.date === today) todayHunt = { date: f.date, fights, lines, healed, overflow }
  }
  if (!todayHunt) {
    const mons = monstersFor(today)
    const s = scaleFor(stats.firstDay, today)
    const hps = [MINION_HP * s, MINION_HP * s, ELITE_HP * s].map(Math.round)
    todayHunt = {
      date: today,
      lines: [],
      healed: 0,
      overflow: 0,
      fights: mons.map((m, i) => ({ monster: m, key: `kill-${today}-${i}`, maxHp: hps[i], hp: hps[i], slain: false, saved: false, drop: null })),
    }
  }

  // Weekly bosses: workouts strike hardest; a quarter of daily overflow joins in.
  const weeks = new Set<DateKey>([...Object.keys(state.workouts), ...overflowByWeek.keys(), startOfWeek(today)])
  let week: BossHunt | null = null
  for (const ws of weeks) {
    if (ws > today) continue
    const boss = bossFor(ws)
    const s = scaleFor(stats.firstDay, ws)
    const maxHp = Math.round(BOSS_HP * s)
    const workouts = state.workouts[ws] ?? 0
    const workoutHits = workouts * 150 * mult('training', boss) + (workouts >= 4 ? 200 : 0)
    const overflowDamage = (overflowByWeek.get(ws) ?? 0) * 0.25
    const key = `boss-${ws}`
    const isSaved = !!saved[key]
    const slain = isSaved || workoutHits + overflowDamage >= maxHp
    if (slain && !isSaved) fresh.push(key)
    const fight: Fight = {
      monster: boss,
      key,
      maxHp,
      hp: slain ? 0 : Math.max(0, Math.round(maxHp - workoutHits - overflowDamage)),
      slain,
      saved: isSaved,
      drop: slain ? rollDrop(key, 'boss', ws) : null,
    }
    if (ws === startOfWeek(today)) week = { weekStart: ws, fight, workoutHits: Math.round(workoutHits), overflowDamage: Math.round(overflowDamage) }
  }

  const allKills = [...savedKills, ...fresh]
  const inventory = itemsFrom(allKills).sort((a, b) => b.date.localeCompare(a.date))
  const kills = { minion: 0, elite: 0, boss: 0 }
  const bossKinds = new Set<string>()
  const slainCount = new Map<string, number>()
  for (const k of allKills) {
    const t = tierOfKill(k)
    kills[t]++
    const m = monsterOfKill(k)
    if (m) {
      slainCount.set(m.id, (slainCount.get(m.id) ?? 0) + 1)
      if (t === 'boss') bossKinds.add(m.id)
    }
  }

  return {
    today: todayHunt,
    week: week!,
    inventory,
    equipped: equip(inventory, equippedIds),
    freshKills: fresh,
    killXp: kills.minion * KILL_XP.minion + kills.elite * KILL_XP.elite + kills.boss * KILL_XP.boss,
    kills,
    bossKinds,
    slainCount,
  }
}

export const itemScore = (i: Item) => i.power + i.affixes.reduce((s, a) => s + a.pct * 100, 0)

/** Your chosen item per slot, or the strongest you own. */
export function equip(items: Item[], chosen: Record<string, string>): Partial<Record<Slot, Item>> {
  const out: Partial<Record<Slot, Item>> = {}
  for (const slot of SLOTS) {
    const own = items.filter((i) => i.slot === slot)
    out[slot] = own.find((i) => i.id === chosen[slot]) ?? own.sort((a, b) => itemScore(b) - itemScore(a))[0]
  }
  return out
}

export const MONSTER_NAME = (id: string) => MONSTER_BY_ID.get(id)?.name ?? id
export const nextDay = (d: DateKey) => addDays(d, 1)
