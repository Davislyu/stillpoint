/**
 * The bestiary of Ravenmoor: gothic, medieval, undead. Every monster has a
 * weakness: the kind of real-world effort that hits it hardest.
 */

export type MonsterKind = 'knight' | 'wraith' | 'skeleton' | 'beast' | 'witch' | 'bat' | 'gargoyle' | 'dragon' | 'lich' | 'vampire'
export type Tier = 'minion' | 'elite' | 'boss'
/** What hurts a monster most. */
export type Source = 'habits' | 'meals' | 'mind' | 'gold' | 'quests' | 'training'

export interface Monster {
  id: string
  name: string
  title: string
  kind: MonsterKind
  tier: Tier
  weakness: Source
  lore: string
}

export const SOURCE_LABEL: Record<Source, string> = {
  habits: 'steady habits',
  meals: 'a full belly',
  mind: 'sharp thinking',
  gold: 'a closed purse',
  quests: 'finished quests',
  training: 'training',
}

export const MINIONS: Monster[] = [
  { id: 'grave-rats', name: 'Grave Rat Swarm', title: 'Gnawers of the Ossuary', kind: 'beast', tier: 'minion', weakness: 'habits', lore: 'They come out when routines slip. Keep the rhythm and they scatter.' },
  { id: 'crypt-ghoul', name: 'Crypt Ghoul', title: 'Ever Hungry', kind: 'beast', tier: 'minion', weakness: 'meals', lore: 'Feeds on the half-starved. A well-fed hero is no meal at all.' },
  { id: 'bone-archer', name: 'Bone Archer', title: 'Of the Broken Wall', kind: 'skeleton', tier: 'minion', weakness: 'habits', lore: 'Looses the same arrow every dawn. Answer it with the same discipline.' },
  { id: 'hollow-squire', name: 'Hollow Squire', title: 'Who Never Knighted', kind: 'knight', tier: 'minion', weakness: 'quests', lore: 'Abandoned every task it was given. Finish yours and it crumbles.' },
  { id: 'plague-monk', name: 'Plague Monk', title: 'Of the Silent Order', kind: 'witch', tier: 'minion', weakness: 'mind', lore: 'Took a vow of thoughtlessness. Written thought burns it.' },
  { id: 'blood-bats', name: 'Blood Bat Swarm', title: 'Of the Bell Tower', kind: 'bat', tier: 'minion', weakness: 'gold', lore: 'They drain coin as readily as blood. A shut purse starves them.' },
  { id: 'barrow-wight', name: 'Barrow Wight', title: 'Keeper of Cold Mounds', kind: 'wraith', tier: 'minion', weakness: 'mind', lore: 'Whispers that tomorrow will do. Reflection drowns the whisper.' },
  { id: 'rusted-sentinel', name: 'Rusted Sentinel', title: 'Of the Fallen Gate', kind: 'knight', tier: 'minion', weakness: 'habits', lore: 'Still guards a gate long gone. Small daily blows break old armour.' },
  { id: 'bog-hag', name: 'Bog Hag', title: 'Of Mirewater', kind: 'witch', tier: 'minion', weakness: 'meals', lore: 'Brews hunger into her stew. Eat well and her hex finds no hold.' },
  { id: 'ash-revenant', name: 'Ash Revenant', title: 'Risen from the Pyre', kind: 'skeleton', tier: 'minion', weakness: 'quests', lore: 'Returns until the day’s work is done. Finish it, and it stays down.' },
  { id: 'chapel-gargoyle', name: 'Chapel Gargoyle', title: 'Stone That Watches', kind: 'gargoyle', tier: 'minion', weakness: 'gold', lore: 'Grows heavier with every coin wasted beneath it.' },
  { id: 'carrion-crows', name: 'Carrion Crow Host', title: 'Of the Gallows Field', kind: 'bat', tier: 'minion', weakness: 'habits', lore: 'Circle anything idle. Keep moving.' },
]

export const ELITES: Monster[] = [
  { id: 'black-templar', name: 'Black Templar', title: 'Oathbreaker of the Order', kind: 'knight', tier: 'elite', weakness: 'quests', lore: 'Swore every vow and kept none. Kept promises cut through its plate.' },
  { id: 'dread-knight', name: 'Dread Knight', title: 'Rider of the Ninth Night', kind: 'knight', tier: 'elite', weakness: 'habits', lore: 'Feared for its patience. Out-patience it.' },
  { id: 'moor-banshee', name: 'Banshee of the Moor', title: 'Who Wails at Dusk', kind: 'wraith', tier: 'elite', weakness: 'mind', lore: 'Her wail scatters thoughts. Write yours down and they hold.' },
  { id: 'grave-warden', name: 'Grave Warden', title: 'Of the Ninefold Crypt', kind: 'skeleton', tier: 'elite', weakness: 'meals', lore: 'Guards the hungry dead. Strength from food is strength it cannot take.' },
  { id: 'thornwood-witch', name: 'Witch of Thornwood', title: 'Mother of Brambles', kind: 'witch', tier: 'elite', weakness: 'gold', lore: 'Sells cures that cure nothing. Refuse her wares.' },
  { id: 'cathedral-gargoyle', name: 'Cathedral Gargoyle', title: 'Of the Broken Spire', kind: 'gargoyle', tier: 'elite', weakness: 'habits', lore: 'Wakes when the bells stop. Ring yours every day.' },
  { id: 'vampire-thrall', name: 'Vampire Thrall', title: 'Of House Velmora', kind: 'vampire', tier: 'elite', weakness: 'meals', lore: 'Drains the weary. A nourished body is poor prey.' },
  { id: 'plague-doctor', name: 'Plague Doctor', title: 'Of Ravenmoor Asylum', kind: 'witch', tier: 'elite', weakness: 'mind', lore: 'Prescribes forgetting. Remember on paper.' },
]

export const BOSSES: Monster[] = [
  { id: 'morcant', name: 'Sir Morcant', title: 'the Hollow Knight', kind: 'knight', tier: 'boss', weakness: 'training', lore: 'Once the realm’s champion, now empty armour. Only strength forged in training can fell him.' },
  { id: 'black-abbess', name: 'The Black Abbess', title: 'of the Drowned Convent', kind: 'witch', tier: 'boss', weakness: 'training', lore: 'Rules a convent of the idle. Sweat is the one prayer she cannot abide.' },
  { id: 'vargoth', name: 'Vargoth', title: 'the Bone Dragon', kind: 'dragon', tier: 'boss', weakness: 'training', lore: 'A dragon of a thousand ribs. Each workout breaks one.' },
  { id: 'velmora', name: 'Countess Velmora', title: 'the Crimson Sovereign', kind: 'vampire', tier: 'boss', weakness: 'training', lore: 'Ageless while you rest. Every session drains her centuries.' },
  { id: 'ravenmoor-lich', name: 'The Lich of Ravenmoor', title: 'Who Counts the Days', kind: 'lich', tier: 'boss', weakness: 'training', lore: 'Counts every day you skip. Make him count your workouts instead.' },
  { id: 'grimwald', name: 'Grimwald', title: 'Warden of Thorns', kind: 'gargoyle', tier: 'boss', weakness: 'training', lore: 'A stone colossus. Only four blows a week can crack him.' },
]

export const ALL_MONSTERS = [...MINIONS, ...ELITES, ...BOSSES]
export const MONSTER_BY_ID = new Map(ALL_MONSTERS.map((m) => [m.id, m]))
