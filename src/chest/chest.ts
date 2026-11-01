import { hash } from '../game/stats'
import type { DayFacts } from '../game/stats'
import type { DateKey } from '../state/types'
import { ADJECTIVES, FLAVOR, LEGENDS, MATERIALS, NOUNS, OF, RARITIES, RARITY_XP, type Category, type Rarity } from './items'

export type ChestTier = 0 | 1 | 2
export const TIER_NAME = ['Wooden', 'Silver', 'Gilded'] as const
export const TIER_ITEMS = [2, 3, 4] as const
const WEIGHTS: Record<ChestTier, number[]> = {
  0: [55, 28, 12, 4, 1],
  1: [40, 32, 19, 7, 2],
  2: [25, 33, 26, 12, 4],
}

export interface Treasure {
  id: string
  name: string
  emoji: string
  category: Category
  rarity: Rarity
  flavor: string
  xp: number
}

export const chestKey = (date: DateKey, tier: ChestTier) => `chest-${date}-t${tier}`
export const isChestKey = (k: string) => /^chest-\d{4}-\d{2}-\d{2}-t[012]$/.test(k)
export const parseChestKey = (k: string): { date: DateKey; tier: ChestTier } => ({ date: k.slice(6, 16), tier: Number(k.slice(-1)) as ChestTier })

/** A tiny seeded generator (mulberry32) so a chest is always the same chest. */
function rng(seed: string) {
  let a = hash(seed)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)]

function rollRarity(r: () => number, tier: ChestTier): Rarity {
  const w = WEIGHTS[tier]
  let x = r() * w.reduce((a, b) => a + b, 0)
  for (let i = 0; i < w.length; i++) {
    x -= w[i]
    if (x < 0) return RARITIES[i]
  }
  return 'common'
}

export function rollTreasure(key: string, index: number, tier: ChestTier): Treasure {
  const r = rng(`${key}#${index}`)
  const rarity = rollRarity(r, tier)
  const id = `${key}#${index}`
  if (rarity === 'legendary' && r() < 0.35) {
    const l = pick(r, LEGENDS)
    return { id, name: l.name, emoji: l.emoji, category: l.category, rarity, flavor: l.flavor, xp: RARITY_XP[rarity] }
  }
  const categories = Object.keys(NOUNS) as Category[]
  const category = pick(r, categories)
  const [noun, emoji] = pick(r, NOUNS[category])
  const suffix = rarity === 'rare' ? (r() < 0.5 ? ` ${pick(r, OF)}` : '') : rarity === 'epic' || rarity === 'legendary' ? ` ${pick(r, OF)}` : ''
  // Gems and critters are things in themselves; they take the adjective but not a material.
  const usesMaterial = category !== 'gem' && category !== 'critter' && category !== 'food' && category !== 'potion'
  const mat = usesMaterial ? pick(r, MATERIALS[rarity]) : ''
  const material = mat ? `${mat[0].toUpperCase()}${mat.slice(1)} ` : ''
  const name = `${pick(r, ADJECTIVES[rarity])} ${material}${noun}${suffix}`
  return { id, name, emoji, category, rarity, flavor: pick(r, FLAVOR[category]), xp: RARITY_XP[rarity] }
}

export const treasuresOf = (key: string): Treasure[] => {
  const { tier } = parseChestKey(key)
  return Array.from({ length: TIER_ITEMS[tier] }, (_, i) => rollTreasure(key, i, tier))
}

/** Today's chest quality, from how much of the day you finished. */
export const tierFor = (f: DayFacts | undefined): ChestTier => (f?.share === 1 ? 2 : f && f.share !== null && f.share >= 0.5 ? 1 : 0)
/** A chest is earned by doing at least one thing that day. */
export const earned = (f: DayFacts | undefined) => !!f?.active

export interface Opened {
  key: string
  date: DateKey
  tier: ChestTier
  items: Treasure[]
}

export interface Chests {
  opened: Opened[]
  /** Earned but not yet opened: today and the two days before. */
  waiting: { date: DateKey; tier: ChestTier }[]
  xp: number
  /** Distinct finds, by name. */
  found: Map<string, Treasure & { count: number; first: DateKey }>
}

export function computeChests(milestones: Record<string, DateKey>, days: DayFacts[], today: DateKey, addDays: (d: DateKey, n: number) => DateKey): Chests {
  const opened: Opened[] = Object.keys(milestones)
    .filter(isChestKey)
    .map((key) => ({ key, ...parseChestKey(key), items: treasuresOf(key) }))
    .sort((a, b) => b.date.localeCompare(a.date))
  const doneDates = new Set(opened.map((o) => o.date))
  const waiting: Chests['waiting'] = []
  for (let back = 0; back <= 2; back++) {
    const d = addDays(today, -back)
    const f = days.find((x) => x.date === d)
    if (!doneDates.has(d) && earned(f)) waiting.push({ date: d, tier: tierFor(f) })
  }
  const found: Chests['found'] = new Map()
  let xp = 0
  for (const o of [...opened].reverse()) {
    for (const it of o.items) {
      xp += it.xp
      const prev = found.get(it.name)
      found.set(it.name, prev ? { ...prev, count: prev.count + 1 } : { ...it, count: 1, first: o.date })
    }
  }
  return { opened, waiting, xp, found }
}
