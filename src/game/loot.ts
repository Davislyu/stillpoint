/**
 * Loot. Items are generated from the seed of the kill that dropped them, so an
 * item is fully described by its id: nothing but the kill needs storing.
 * Rarer items roll more affixes (bonus traits), Diablo-style.
 */
import { hash } from './stats'
import type { Source, Tier } from './bestiary'

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type Slot = 'weapon' | 'helm' | 'armor' | 'gloves' | 'boots' | 'relic'

export const SLOTS: Slot[] = ['weapon', 'helm', 'armor', 'gloves', 'boots', 'relic']
export const SLOT_LABEL: Record<Slot, string> = { weapon: 'Weapon', helm: 'Helm', armor: 'Armour', gloves: 'Gauntlets', boots: 'Boots', relic: 'Relic' }
export const ITEM_RARITIES: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export interface Affix {
  source: Source | 'all'
  /** Damage bonus, e.g. 0.08 = +8%. */
  pct: number
}

export interface Item {
  id: string
  name: string
  slot: Slot
  rarity: ItemRarity
  /** Flat damage added each day you act. */
  power: number
  affixes: Affix[]
  /** Kill that dropped it. */
  from: string
  date: string
}

const BASES: Record<Slot, string[]> = {
  weapon: ['Longsword', 'Flail', 'War Scythe', 'Morningstar', 'Bastard Sword', 'Mace', 'Hand Crossbow', 'Halberd'],
  helm: ['Great Helm', 'Bascinet', 'Barbute', 'Hood', 'Sallet', 'Coif'],
  armor: ['Hauberk', 'Brigandine', 'Cuirass', 'Penitent Robe', 'Gambeson', 'Plate'],
  gloves: ['Gauntlets', 'Grips', 'Vambraces', 'Bracers'],
  boots: ['Sabatons', 'Greaves', 'Pilgrim Boots', 'Treads'],
  relic: ['Reliquary', 'Signet Ring', 'Rosary', 'Amulet', 'Bone Charm', 'Censer'],
}
const PREFIX: Record<ItemRarity, string[]> = {
  common: ['Rusted', 'Worn', 'Chipped', 'Dented', 'Plain'],
  uncommon: ['Iron', 'Blackened', 'Tempered', 'Sturdy'],
  rare: ['Gravebound', 'Moonlit', 'Ashen', 'Thorned', 'Hallowed'],
  epic: ['Dread', 'Bloodsworn', 'Wraithforged', 'Nightfall', 'Cathedral'],
  legendary: [],
}
const SUFFIX: Record<Source | 'all', string> = {
  habits: 'of the Pilgrim',
  meals: 'of the Feast',
  mind: 'of the Scholar',
  gold: 'of the Miser',
  quests: 'of the Vigil',
  training: 'of the Crusade',
  all: 'of Ravenmoor',
}
/** Legendary items have names of their own. */
const LEGENDARY: Record<Slot, string[]> = {
  weapon: ["Morcant's Oathblade", 'Gravesong, the Last Bell', "The Lich's Quill"],
  helm: ['Crown of the Hollow King', 'Visage of the Black Abbess'],
  armor: ["Vargoth's Ribcage", 'Mantle of Countess Velmora'],
  gloves: ['Hands of the Gravedigger Saint'],
  boots: ['Treads of the Pale Rider'],
  relic: ['The Unbroken Rosary', 'Heart of Grimwald', 'Lantern of Ravenmoor'],
}

const SOURCES: Source[] = ['habits', 'meals', 'mind', 'gold', 'quests', 'training']
const POWER: Record<ItemRarity, number> = { common: 2, uncommon: 4, rare: 7, epic: 11, legendary: 16 }
const AFFIXES: Record<ItemRarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 3 }
const AFFIX_PCT: Record<ItemRarity, number> = { common: 0, uncommon: 0.05, rare: 0.08, epic: 0.12, legendary: 0.15 }

/** Drop tables: chance of any drop, then rarity weights. */
const TABLE: Record<Tier, { chance: number; weights: [ItemRarity, number][] }> = {
  minion: { chance: 0.6, weights: [['common', 70], ['uncommon', 22], ['rare', 7], ['epic', 1]] },
  elite: { chance: 1, weights: [['common', 30], ['uncommon', 40], ['rare', 22], ['epic', 7], ['legendary', 1]] },
  boss: { chance: 1, weights: [['rare', 55], ['epic', 35], ['legendary', 10]] },
}

/** A deterministic 0–1 roll from any seed. */
export const roll = (seed: string) => (hash(seed) % 100000) / 100000

export function rollDrop(killId: string, tier: Tier, date: string): Item | null {
  const t = TABLE[tier]
  if (roll(`${killId}:drop`) >= t.chance) return null
  const total = t.weights.reduce((s, [, w]) => s + w, 0)
  let r = roll(`${killId}:rarity`) * total
  let rarity: ItemRarity = t.weights[0][0]
  for (const [k, w] of t.weights) {
    if (r < w) {
      rarity = k
      break
    }
    r -= w
  }
  const pick = <T,>(list: T[], salt: string) => list[hash(`${killId}:${salt}`) % list.length]
  const slot = pick(SLOTS, 'slot')

  const affixes: Affix[] = []
  const pool = [...SOURCES]
  for (let i = 0; i < AFFIXES[rarity]; i++) {
    const src = pool.splice(hash(`${killId}:affix${i}`) % pool.length, 1)[0]
    affixes.push({ source: src, pct: AFFIX_PCT[rarity] })
  }
  if (rarity === 'legendary') affixes.push({ source: 'all', pct: 0.1 })

  const name =
    rarity === 'legendary'
      ? pick(LEGENDARY[slot], 'legend')
      : `${pick(PREFIX[rarity], 'prefix')} ${pick(BASES[slot], 'base')}${affixes[0] ? ` ${SUFFIX[affixes[0].source]}` : ''}`

  return { id: killId, name, slot, rarity, power: POWER[rarity], affixes, from: killId, date }
}

export const ITEM_COLOR: Record<ItemRarity, string> = {
  common: 'var(--muted)',
  uncommon: 'var(--accent-sage)',
  rare: 'var(--accent-dusk)',
  epic: 'var(--accent-mauve)',
  legendary: 'var(--accent-sand)',
}

export function describeAffix(a: Affix): string {
  const pct = `+${Math.round(a.pct * 100)}%`
  return a.source === 'all' ? `${pct} damage from everything` : `${pct} damage from ${a.source === 'training' ? 'workouts' : a.source}`
}
