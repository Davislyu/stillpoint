/**
 * The bestiary of Ravenmoor: gothic, medieval, undead. Every monster has a
 * weakness: the kind of real-world effort that hits it hardest.
 */

export type MonsterKind = 'knight' | 'wraith' | 'skeleton' | 'beast' | 'witch' | 'bat' | 'gargoyle' | 'dragon' | 'lich' | 'vampire' | 'slime' | 'mushroom' | 'spider' | 'owl'
export type RegionId = 'ravenmoor' | 'emberfen' | 'glasswood' | 'frostmere'
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
  region: RegionId
  /** What a hunter's notebook says about it. */
  note?: string
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
  { id: 'grave-rats', name: 'Grave Rat Swarm', title: 'Gnawers of the Ossuary', kind: 'beast', tier: 'minion', region: 'ravenmoor', weakness: 'habits', lore: 'They come out when routines slip. Keep the rhythm and they scatter.' },
  { id: 'crypt-ghoul', name: 'Crypt Ghoul', title: 'Ever Hungry', kind: 'beast', tier: 'minion', region: 'ravenmoor', weakness: 'meals', lore: 'Feeds on the half-starved. A well-fed hero is no meal at all.' },
  { id: 'bone-archer', name: 'Bone Archer', title: 'Of the Broken Wall', kind: 'skeleton', tier: 'minion', region: 'ravenmoor', weakness: 'habits', lore: 'Looses the same arrow every dawn. Answer it with the same discipline.' },
  { id: 'hollow-squire', name: 'Hollow Squire', title: 'Who Never Knighted', kind: 'knight', tier: 'minion', region: 'ravenmoor', weakness: 'quests', lore: 'Abandoned every task it was given. Finish yours and it crumbles.' },
  { id: 'plague-monk', name: 'Plague Monk', title: 'Of the Silent Order', kind: 'witch', tier: 'minion', region: 'ravenmoor', weakness: 'mind', lore: 'Took a vow of thoughtlessness. Written thought burns it.' },
  { id: 'blood-bats', name: 'Blood Bat Swarm', title: 'Of the Bell Tower', kind: 'bat', tier: 'minion', region: 'ravenmoor', weakness: 'gold', lore: 'They drain coin as readily as blood. A shut purse starves them.' },
  { id: 'barrow-wight', name: 'Barrow Wight', title: 'Keeper of Cold Mounds', kind: 'wraith', tier: 'minion', region: 'ravenmoor', weakness: 'mind', lore: 'Whispers that tomorrow will do. Reflection drowns the whisper.' },
  { id: 'rusted-sentinel', name: 'Rusted Sentinel', title: 'Of the Fallen Gate', kind: 'knight', tier: 'minion', region: 'ravenmoor', weakness: 'habits', lore: 'Still guards a gate long gone. Small daily blows break old armour.' },
  { id: 'bog-hag', name: 'Bog Hag', title: 'Of Mirewater', kind: 'witch', tier: 'minion', region: 'ravenmoor', weakness: 'meals', lore: 'Brews hunger into her stew. Eat well and her hex finds no hold.' },
  { id: 'ash-revenant', name: 'Ash Revenant', title: 'Risen from the Pyre', kind: 'skeleton', tier: 'minion', region: 'ravenmoor', weakness: 'quests', lore: 'Returns until the day’s work is done. Finish it, and it stays down.' },
  { id: 'chapel-gargoyle', name: 'Chapel Gargoyle', title: 'Stone That Watches', kind: 'gargoyle', tier: 'minion', region: 'ravenmoor', weakness: 'gold', lore: 'Grows heavier with every coin wasted beneath it.' },
  { id: 'carrion-crows', name: 'Carrion Crow Host', title: 'Of the Gallows Field', kind: 'bat', tier: 'minion', region: 'ravenmoor', weakness: 'habits', lore: 'Circle anything idle. Keep moving.' },
]

export const ELITES: Monster[] = [
  { id: 'black-templar', name: 'Black Templar', title: 'Oathbreaker of the Order', kind: 'knight', tier: 'elite', region: 'ravenmoor', weakness: 'quests', lore: 'Swore every vow and kept none. Kept promises cut through its plate.' },
  { id: 'dread-knight', name: 'Dread Knight', title: 'Rider of the Ninth Night', kind: 'knight', tier: 'elite', region: 'ravenmoor', weakness: 'habits', lore: 'Feared for its patience. Out-patience it.' },
  { id: 'moor-banshee', name: 'Banshee of the Moor', title: 'Who Wails at Dusk', kind: 'wraith', tier: 'elite', region: 'ravenmoor', weakness: 'mind', lore: 'Her wail scatters thoughts. Write yours down and they hold.' },
  { id: 'grave-warden', name: 'Grave Warden', title: 'Of the Ninefold Crypt', kind: 'skeleton', tier: 'elite', region: 'ravenmoor', weakness: 'meals', lore: 'Guards the hungry dead. Strength from food is strength it cannot take.' },
  { id: 'thornwood-witch', name: 'Witch of Thornwood', title: 'Mother of Brambles', kind: 'witch', tier: 'elite', region: 'ravenmoor', weakness: 'gold', lore: 'Sells cures that cure nothing. Refuse her wares.' },
  { id: 'cathedral-gargoyle', name: 'Cathedral Gargoyle', title: 'Of the Broken Spire', kind: 'gargoyle', tier: 'elite', region: 'ravenmoor', weakness: 'habits', lore: 'Wakes when the bells stop. Ring yours every day.' },
  { id: 'vampire-thrall', name: 'Vampire Thrall', title: 'Of House Velmora', kind: 'vampire', tier: 'elite', region: 'ravenmoor', weakness: 'meals', lore: 'Drains the weary. A nourished body is poor prey.' },
  { id: 'plague-doctor', name: 'Plague Doctor', title: 'Of Ravenmoor Asylum', kind: 'witch', tier: 'elite', region: 'ravenmoor', weakness: 'mind', lore: 'Prescribes forgetting. Remember on paper.' },
]

export const BOSSES: Monster[] = [
  { id: 'morcant', name: 'Sir Morcant', title: 'the Hollow Knight', kind: 'knight', tier: 'boss', region: 'ravenmoor', weakness: 'training', lore: 'Once the realm’s champion, now empty armour. Only strength forged in training can fell him.' },
  { id: 'black-abbess', name: 'The Black Abbess', title: 'of the Drowned Convent', kind: 'witch', tier: 'boss', region: 'ravenmoor', weakness: 'training', lore: 'Rules a convent of the idle. Sweat is the one prayer she cannot abide.' },
  { id: 'vargoth', name: 'Vargoth', title: 'the Bone Dragon', kind: 'dragon', tier: 'boss', region: 'ravenmoor', weakness: 'training', lore: 'A dragon of a thousand ribs. Each workout breaks one.' },
  { id: 'velmora', name: 'Countess Velmora', title: 'the Crimson Sovereign', kind: 'vampire', tier: 'boss', region: 'ravenmoor', weakness: 'training', lore: 'Ageless while you rest. Every session drains her centuries.' },
  { id: 'ravenmoor-lich', name: 'The Lich of Ravenmoor', title: 'Who Counts the Days', kind: 'lich', tier: 'boss', region: 'ravenmoor', weakness: 'training', lore: 'Counts every day you skip. Make him count your workouts instead.' },
  { id: 'grimwald', name: 'Grimwald', title: 'Warden of Thorns', kind: 'gargoyle', tier: 'boss', region: 'ravenmoor', weakness: 'training', lore: 'A stone colossus. Only four blows a week can crack him.' },
]

export const REGIONS: Record<RegionId, { name: string; blurb: string }> = {
  ravenmoor: { name: 'Ravenmoor', blurb: 'Gothic moorland: bells, bones and old oaths.' },
  emberfen: { name: 'The Emberfen', blurb: 'A warm marsh of lantern reeds, soft things and sticky trouble.' },
  glasswood: { name: 'The Glasswood', blurb: 'A hush of silver trees where small creatures steal your hours.' },
  frostmere: { name: 'Frostmere', blurb: 'A frozen lake under a very long night.' },
}

/**
 * Added in November 2026. Monsters from here only appear on days from NEW_ERA on, so
 * every day (and every saved kill) before it keeps the monster it always had.
 */
export const NEW_ERA = '2026-11-02'
const m = (id: string, name: string, title: string, kind: MonsterKind, tier: Tier, region: RegionId, weakness: Source, lore: string, note: string): Monster => ({ id, name, title, kind, tier, region, weakness, lore, note })

export const NEW_MINIONS: Monster[] = [
  m('ember-slime', 'Ember Slime', 'Warm and Wobbling', 'slime', 'minion', 'emberfen', 'habits', 'Soft, sticky and always a little too comfortable. Small daily steps dissolve it.', 'Leaves a faint glow on everything it touches. Harmless, until you sit down next to it.'),
  m('lantern-reed', 'Lantern Reed Sprite', 'Of the Murmuring Reeds', 'wraith', 'minion', 'emberfen', 'mind', 'Carries a borrowed light and leads the unwary in circles. Writing down where you are ends the game.', 'Always giggling. Always one step to the left of where you are looking.'),
  m('cap-gnasher', 'Cap Gnasher', 'Of the Spore Ring', 'mushroom', 'minion', 'emberfen', 'meals', 'Hungry, loud, and made mostly of hat. A proper meal makes it lose interest.', 'Seen in groups of seven. Never six, never eight.'),
  m('hollow-weaver', 'Hollow Weaver', 'Of the Silk Pits', 'spider', 'minion', 'glasswood', 'quests', 'Spins half-finished threads everywhere. Finishing a thing snips them all.', 'Every unfinished task leaves a strand. It can feel them.'),
  m('hushwing', 'Hushwing', 'Who Steals the Hour', 'owl', 'minion', 'glasswood', 'habits', 'Swoops in at midnight to take an hour you meant to spend well. A steady routine keeps the hours yours.', 'Silent flier. You only notice it by what is missing.'),
  m('rime-hound', 'Rime Hound', 'Of the Frozen Lane', 'beast', 'minion', 'frostmere', 'meals', 'Always shivering, always hunting something warm. A full belly warms you out of its reach.', 'Follows breath-clouds. Will sit with you if you share a snack.'),
  m('frost-wisp', 'Frost Wisp', 'Of the Pale Lake', 'wraith', 'minion', 'frostmere', 'gold', 'Drifts toward money left lying about and freezes it solid. A closed purse leaves it nothing to freeze.', 'It sings. The song is a price list.'),
  m('thorn-imp', 'Thorn Imp', 'Prickly Little Liar', 'bat', 'minion', 'glasswood', 'quests', 'Swears the chore can wait. It never can. Finish it and the imp sulks away.', 'Hates lists with ticks on them.'),
  m('moss-golem', 'Moss Golem', 'Slow, Patient, Green', 'gargoyle', 'minion', 'emberfen', 'habits', 'Grows over anything left alone too long. Keep moving and it never takes root.', 'A good listener. A terrible houseguest.'),
  m('glass-moth', 'Glass Moth', 'Of the Silver Lamp', 'bat', 'minion', 'glasswood', 'mind', 'Wings like windowpanes; you can see right through its excuses. Thinking clearly shatters it.', 'Collects dust, and your half-formed ideas.'),
]
export const NEW_ELITES: Monster[] = [
  m('lantern-man', 'The Lantern Man', 'Who Leads You Astray', 'wraith', 'elite', 'emberfen', 'habits', 'A tall figure with a kind light and no destination. Your own routine is the only road he cannot bend.', 'He is never lying. He just never says where the path ends.'),
  m('spore-matriarch', 'Spore Matriarch', 'Mother of Rings', 'mushroom', 'elite', 'emberfen', 'meals', 'Feeds a whole fen from one huge cap. A hero who eats well is no use to her spores.', 'Her hat is a roof for nine families. She is very proud.'),
  m('silk-queen', 'The Silk Queen', 'Of Ten Thousand Threads', 'spider', 'elite', 'glasswood', 'quests', 'Has never finished anything, and neither has anyone in her web. Complete your quests and her threads part.', 'Prefers tea. Will not share the recipe.'),
  m('archowl', 'Archowl Noctis', 'Keeper of the Small Hours', 'owl', 'elite', 'glasswood', 'mind', 'Knows everything you meant to remember. Write it down first and he has nothing to say.', 'Blinks once per hour. You can tell the time by it.'),
  m('frost-warden', 'Frostmere Warden', 'Who Guards the Ice', 'knight', 'elite', 'frostmere', 'gold', 'Keeps a vault of things you could have saved. Save a little and the vault empties.', 'Salutes everyone. Even the ones it is about to freeze.'),
]
export const NEW_BOSSES: Monster[] = [
  m('cinder-wyrm', 'The Cinder Wyrm', 'Who Sleeps on Embers', 'dragon', 'boss', 'emberfen', 'training', 'Coiled around the fen and warm as a bed. Only the heat you make yourself can outlast it.', 'It never attacks. It simply makes staying in bed sound reasonable.'),
  m('king-gloop', 'King Gloop', 'The Sluggard King', 'slime', 'boss', 'emberfen', 'training', 'Rules by lying still. Four good workouts a week shake his whole kingdom apart.', 'Wears a crown he found. It does not fit. He insists it does.'),
  m('long-night', 'The Long Night', 'Great Owl of Frostmere', 'owl', 'boss', 'frostmere', 'training', 'Her shadow covers the lake all winter. Movement is the only lantern she cannot snuff.', 'Her wings beat once a week. That is the week.'),
]

/** Hunter's-notebook lines for the older monsters. */
export const LEGACY_NOTES: Record<string, string> = {
  morcant: 'His armour echoes when he walks. Inside it is only the sound of an oath.',
  'black-abbess': 'Her hymn has one verse and a thousand repeats.',
  vargoth: 'Count his ribs while he sleeps. There are always more than you expected.',
  velmora: 'Her mirror shows no one. Hers is the only face that keeps you from yours.',
  'ravenmoor-lich': 'Keeps a ledger of your skipped days. He is pedantic about it.',
  grimwald: 'Slow to wake, slower to fall. Bring patience.',
  'black-templar': 'His shield bears a crest nobody remembers.',
  'dread-knight': 'He waits. He is very good at waiting.',
  'moor-banshee': 'Her wail is just a question nobody answered.',
  'plague-doctor': 'The mask is empty. So is the bag.',
}

const OLD_MINIONS = MINIONS
export const ALL_MINIONS = [...OLD_MINIONS, ...NEW_MINIONS]
export const ALL_ELITES = [...ELITES, ...NEW_ELITES]
export const ALL_BOSSES = [...BOSSES, ...NEW_BOSSES]
export const ALL_MONSTERS = [...ALL_MINIONS, ...ALL_ELITES, ...ALL_BOSSES]
export const MONSTER_BY_ID = new Map(ALL_MONSTERS.map((x) => [x.id, x]))
for (const x of ALL_MONSTERS) if (!x.note && LEGACY_NOTES[x.id]) x.note = LEGACY_NOTES[x.id]
