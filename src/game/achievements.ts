/**
 * The achievement catalog: exactly 300, generated from tiered families.
 * IDs are stable and stored in the `milestones` table once earned, so an
 * achievement never re-locks even if old data later leaves the loaded window.
 * The original streak milestones keep their IDs (streak-3, -7, -14, -30).
 */
import type { ThemeId } from '../themes/registry'
import type { PlayerStats } from './stats'

export type Category = 'hunt' | 'habits' | 'body' | 'training' | 'mind' | 'gold' | 'explorer' | 'legend' | 'secret'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
export const RARITY_XP: Record<Rarity, number> = { common: 20, uncommon: 50, rare: 100, epic: 250, legendary: 500, mythic: 1000 }
export const CATEGORY_LABEL: Record<Category, string> = {
  hunt: 'Hunt',
  habits: 'Habits',
  body: 'Meals',
  training: 'Training',
  mind: 'Mind',
  gold: 'Gold',
  explorer: 'Explorer',
  legend: 'Legend',
  secret: 'Secrets',
}

export interface GameCtx {
  stats: PlayerStats
  level: number
  totalXp: number
  unlockedCount: number
  themesTried: ThemeId[]
  questsCompleted: number
  boardsCleared: number
  habitTicksByName: (re: RegExp) => number
  bodyAndSoulDays: number
  hunt: { kills: number; elites: number; bosses: number; bossKinds: Set<string>; items: number; epics: number; legendaries: number }
}

export interface Achievement {
  id: string
  name: string
  description: string
  category: Category
  rarity: Rarity
  xp: number
  hidden: boolean
  /** Metric value and target, for progress bars. */
  metric: (c: GameCtx) => number | null
  target: number
  /** 'lte': reached when the metric falls to the target or below. */
  dir: 'gte' | 'lte'
}

type Tier = [threshold: number, name: string, rarity?: Rarity]

interface Family {
  id: string
  category: Category
  metric: (c: GameCtx) => number | null
  describe: (t: number) => string
  tiers: Tier[]
  dir?: 'gte' | 'lte'
  hidden?: boolean
}

const n = (x: number) => x.toLocaleString('en-US')
const plural = (x: number, one: string, many = `${one}s`) => `${n(x)} ${x === 1 ? one : many}`
const dollars = (cents: number) => `$${n(cents / 100)}`

const FAMILIES: Family[] = [
  // ── Hunt ──────────────────────────────────────────────────────────────
  { id: 'slayer', category: 'hunt', metric: (c) => c.hunt.kills, describe: (t) => `Slay ${plural(t, 'monster')}.`,
    tiers: [[1, 'First Blood'], [10, 'Monster Hunter'], [25, 'Grave Cleaner'], [50, 'Crypt Breaker'], [100, 'Hundred Slain'], [250, 'Scourge of the Dead'], [500, 'Bane of Ravenmoor'], [1000, 'Thousand Graves']] },
  { id: 'elite-slayer', category: 'hunt', metric: (c) => c.hunt.elites, describe: (t) => `Slay ${plural(t, 'elite')}.`,
    tiers: [[1, 'Elite Hunter'], [5, "Champion's Mark"], [10, 'Knightfall'], [25, "Templar's Doom"], [50, 'Dread Breaker'], [100, 'Hundred Champions']] },
  { id: 'boss-slayer', category: 'hunt', metric: (c) => c.hunt.bosses, describe: (t) => `Defeat ${plural(t, 'weekly boss', 'weekly bosses')}.`,
    tiers: [[1, 'Bossfall'], [4, 'Month of Kings'], [12, 'Season of Crowns'], [26, 'Half-Year Reign'], [52, 'Kingslayer of the Year']] },
  ...([
    ['morcant', 'Hollow No More', 'Sir Morcant, the Hollow Knight'],
    ['black-abbess', 'Abbess Unveiled', 'the Black Abbess'],
    ['vargoth', 'Dragonbone Trophy', 'Vargoth the Bone Dragon'],
    ['velmora', 'Dawn over Velmora', 'Countess Velmora'],
    ['ravenmoor-lich', 'The Count Ends', 'the Lich of Ravenmoor'],
    ['grimwald', 'Thorns Cut Down', 'Grimwald, Warden of Thorns'],
  ] as const).map(([id, name, who]): Family => ({
    id: `fell-${id}`, category: 'hunt', metric: (c) => (c.hunt.bossKinds.has(id) ? 1 : 0),
    describe: () => `Defeat ${who}.`, tiers: [[1, name, 'epic']],
  })),
  { id: 'hoard', category: 'hunt', metric: (c) => c.hunt.items, describe: (t) => `Collect ${plural(t, 'item')} from drops.`,
    tiers: [[1, 'First Loot'], [10, 'Pack Rat'], [25, 'Armoury'], [50, 'Treasury'], [100, 'Vault of Ravenmoor'], [250, 'The Great Hoard']] },
  { id: 'epic-loot', category: 'hunt', metric: (c) => c.hunt.epics, describe: (t) => `Find ${plural(t, 'epic item')}.`,
    tiers: [[1, 'Epic Find', 'rare'], [5, 'Collector of Dread', 'epic'], [10, 'Epic Armoury', 'legendary']] },
  { id: 'legendary-loot', category: 'hunt', metric: (c) => c.hunt.legendaries, describe: (t) => `Find ${plural(t, 'legendary item')}.`,
    tiers: [[1, 'Legend in Hand', 'epic'], [3, 'Myth Bearer', 'legendary'], [6, 'Living Legend of Loot', 'mythic']] },

  // ── Habits ────────────────────────────────────────────────────────────
  { id: 'ticks', category: 'habits', metric: (c) => c.stats.habitTicks, describe: (t) => `Tick off ${plural(t, 'habit')}.`,
    tiers: [[1, 'First Tick'], [10, 'Ten Down'], [25, 'Quarter Century'], [50, 'Half a Hundred'], [100, 'Centurion'], [250, 'Habit Engine'], [500, 'Five Hundred Strong'], [1000, 'The Thousand'], [2500, 'Relentless'], [5000, 'Living Ritual'], [10000, 'Ten Thousand Ticks']] },
  { id: 'perfect', category: 'habits', metric: (c) => c.stats.perfectDays, describe: (t) => `Finish every habit on ${plural(t, 'day')}.`,
    tiers: [[1, 'Flawless'], [3, 'Hat Trick'], [7, 'Seven Clean Days'], [14, 'Fortnight Flawless'], [30, 'Spotless Month'], [50, 'Fifty Clean'], [100, 'Immaculate Hundred'], [200, 'Polished'], [365, 'A Perfect Year of Days']] },
  { id: 'streak', category: 'habits', metric: (c) => c.stats.bestStreak, describe: (t) => `Reach a ${t}-day streak at half or more.`,
    tiers: [[3, 'Three in a row'], [5, 'High Five'], [7, 'A full week'], [10, 'Double Digits'], [14, 'Two weeks'], [21, 'Habit Formed'], [30, 'A month'], [45, 'Unbroken'], [60, 'Two Moons'], [90, 'The Quarter'], [120, 'Four Moons'], [180, 'Half-Year Flame'], [270, 'Three Seasons'], [365, 'The Eternal Flame']] },
  { id: 'flawless-run', category: 'habits', metric: (c) => c.stats.bestPerfectStreak, describe: (t) => `Finish every habit ${t} days running.`,
    tiers: [[2, 'Back to Back'], [3, 'Triple Crown'], [5, 'Five Star'], [7, 'Seven Seals'], [14, 'Untouchable'], [21, 'Pristine'], [30, 'Perfection Incarnate'], [60, 'Mythic Precision']] },
  { id: 'multitask', category: 'habits', metric: (c) => c.stats.maxHabitsInDay, describe: (t) => `Tick ${t} habits in a single day.`,
    tiers: [[3, 'Juggler'], [5, 'Plate Spinner'], [8, 'Octopus'], [12, 'Many-Handed']] },
  { id: 'architect', category: 'habits', metric: (c) => c.stats.habitsCreated, describe: (t) => `Have ${plural(t, 'habit')} on your list, past or present.`,
    tiers: [[1, 'Blueprint'], [5, 'Builder'], [10, 'Architect'], [20, 'Grand Designer']] },
  { id: 'clean-week', category: 'habits', metric: (c) => c.stats.perfectWeeks, describe: (t) => `Keep all 7 days of a week at half or more, ${plural(t, 'time')}.`,
    tiers: [[1, 'Clean Sweep'], [4, 'Month of Sundays'], [12, 'Seasoned'], [26, 'Half-Year Hero'], [52, 'Year of Weeks']] },
  { id: 'clean-month', category: 'habits', metric: (c) => c.stats.perfectMonths, describe: (t) => `Keep every tracked day of a month at half or more, ${plural(t, 'time')}.`,
    tiers: [[1, 'Moon Keeper'], [3, 'Season Keeper'], [6, 'Half-Year Keeper'], [12, 'Keeper of the Year']] },
  { id: 'weekend', category: 'habits', metric: (c) => c.stats.weekendPerfects, describe: (t) => `Finish every habit on both days of a weekend, ${plural(t, 'time')}.`,
    tiers: [[1, 'Weekend Warrior'], [4, 'No Days Off'], [12, 'Weekend Legend']] },
  { id: 'named-water', category: 'habits', metric: (c) => c.habitTicksByName(/water|hydrat/i), describe: (t) => `Tick a water habit ${plural(t, 'time')}.`,
    tiers: [[30, 'Hydrated', 'uncommon'], [100, 'Waterlogged', 'rare']] },
  { id: 'named-gym', category: 'habits', metric: (c) => c.habitTicksByName(/gym|lift|weights/i), describe: (t) => `Tick a gym habit ${plural(t, 'time')}.`,
    tiers: [[30, 'Gym Regular', 'uncommon'], [100, 'Gym Legend', 'rare']] },
  { id: 'named-stretch', category: 'habits', metric: (c) => c.habitTicksByName(/stretch|yoga|mobility/i), describe: (t) => `Tick a stretching habit ${plural(t, 'time')}.`,
    tiers: [[30, 'Flexible', 'uncommon'], [100, 'Rubber Band', 'rare']] },
  { id: 'named-cardio', category: 'habits', metric: (c) => c.habitTicksByName(/cardio|run|cycle|swim|walk/i), describe: (t) => `Tick a cardio habit ${plural(t, 'time')}.`,
    tiers: [[30, 'Cardio Regular', 'uncommon'], [100, 'Marathon Heart', 'rare']] },
  { id: 'named-read', category: 'habits', metric: (c) => c.habitTicksByName(/read|book|study/i), describe: (t) => `Tick a reading habit ${plural(t, 'time')}.`,
    tiers: [[30, 'Bookworm', 'uncommon'], [100, 'Library Card', 'rare']] },

  // ── Meals ─────────────────────────────────────────────────────────────
  { id: 'meals', category: 'body', metric: (c) => c.stats.mealsLogged, describe: (t) => `Log ${plural(t, 'meal')}.`,
    tiers: [[1, 'First Bite'], [10, 'Fed'], [25, 'Regular'], [50, 'Well Fed'], [100, 'Hundred Plates'], [250, 'Grazer'], [500, 'Five Hundred Plates'], [1000, 'Feast Master'], [2500, 'Bottomless'], [5000, 'The Great Feast']] },
  { id: 'five-a-day', category: 'body', metric: (c) => c.stats.fullMealDays, describe: (t) => `Eat all 5 meals on ${plural(t, 'day')}.`,
    tiers: [[1, 'Five for Five'], [3, 'Fueled'], [7, 'Bulking Week'], [14, 'Steady Gains'], [30, 'Meal Prepper'], [60, 'Kitchen Regular'], [100, 'Nutrition Ninja'], [200, 'Iron Stomach'], [365, 'A Year of Plates']] },
  { id: 'fuel-streak', category: 'body', metric: (c) => c.stats.bestFullMealStreak, describe: (t) => `Eat all 5 meals ${t} days running.`,
    tiers: [[3, 'On Schedule'], [7, 'Clockwork'], [14, 'Metronome'], [30, 'Machine'], [60, 'Perpetual Motion']] },
  { id: 'menu', category: 'body', metric: (c) => c.stats.mealNotes, describe: (t) => `Write ${plural(t, 'meal note')}.`,
    tiers: [[1, 'Food Critic'], [10, 'Menu Writer'], [50, 'Recipe Book'], [100, 'Cookbook'], [250, 'Food Historian'], [500, 'Gastronome']] },
  { id: 'slot-1', category: 'body', metric: (c) => c.stats.mealSlot[1], describe: (t) => `Eat Meal 1 ${plural(t, 'time')}.`, tiers: [[30, 'Early Riser', 'uncommon'], [100, 'Breakfast Club', 'rare']] },
  { id: 'slot-2', category: 'body', metric: (c) => c.stats.mealSlot[2], describe: (t) => `Eat Meal 2 ${plural(t, 'time')}.`, tiers: [[30, 'Second Breakfast', 'uncommon'], [100, 'Elevenses Expert', 'rare']] },
  { id: 'slot-3', category: 'body', metric: (c) => c.stats.mealSlot[3], describe: (t) => `Eat Meal 3 ${plural(t, 'time')}.`, tiers: [[30, 'Midday Regular', 'uncommon'], [100, 'Lunch Legend', 'rare']] },
  { id: 'slot-4', category: 'body', metric: (c) => c.stats.mealSlot[4], describe: (t) => `Eat Meal 4 ${plural(t, 'time')}.`, tiers: [[30, 'Afternoon Fuel', 'uncommon'], [100, 'Snack Strategist', 'rare']] },
  { id: 'slot-5', category: 'body', metric: (c) => c.stats.mealSlot[5], describe: (t) => `Eat Meal 5 ${plural(t, 'time')}.`, tiers: [[30, 'Closing Plate', 'uncommon'], [100, 'Dinner Devotee', 'rare']] },
  { id: 'body-soul', category: 'body', metric: (c) => c.bodyAndSoulDays, describe: (t) => `All 5 meals and every habit done on ${plural(t, 'day')}.`,
    tiers: [[1, 'Body and Soul', 'uncommon'], [10, 'Temple', 'epic'], [50, 'Avatar of Balance', 'legendary']] },

  // ── Training ──────────────────────────────────────────────────────────
  { id: 'workouts', category: 'training', metric: (c) => c.stats.workoutsTotal, describe: (t) => `Log ${plural(t, 'workout')}.`,
    tiers: [[1, 'First Rep'], [4, 'Warmed Up'], [10, 'Gym Rat'], [25, 'Iron Will'], [50, 'Fifty Sessions'], [100, 'Century of Iron'], [150, 'Steel Forged'], [200, 'Two Hundred Club'], [300, 'Spartan'], [500, 'Titan']] },
  { id: 'full-week', category: 'training', metric: (c) => c.stats.fullWeeks, describe: (t) => `Hit 4 workouts in a week, ${plural(t, 'time')}.`,
    tiers: [[1, 'Mandate Met'], [2, 'Twice Over'], [4, 'Month of Mandates'], [8, 'Two Months Strong'], [12, 'Quarter Done'], [26, 'Half-Year Iron'], [52, 'Year of Iron']] },
  { id: 'iron-chain', category: 'training', metric: (c) => c.stats.bestFullWeekStreak, describe: (t) => `Hit 4 workouts ${t} weeks running.`,
    tiers: [[2, 'Chain Started'], [3, 'Three Links'], [4, 'Iron Month'], [6, 'Six Strong Weeks'], [8, 'Unyielding'], [12, 'Juggernaut'], [26, 'Colossus'], [52, 'Unstoppable']] },
  { id: 'month-max', category: 'training', metric: (c) => c.stats.bestWorkoutMonth, describe: (t) => `Log ${t} workouts in one month.`,
    tiers: [[8, 'Busy Month'], [12, 'Twelve Labours'], [16, 'Max Month']] },

  // ── Mind ──────────────────────────────────────────────────────────────
  { id: 'journal', category: 'mind', metric: (c) => c.stats.noteDays, describe: (t) => `Write notes on ${plural(t, 'day')}.`,
    tiers: [[1, 'Dear Diary'], [3, 'Scribbler'], [7, 'Week of Words'], [14, 'Journaler'], [30, 'Chronicler'], [60, 'Archivist'], [100, 'Hundred Pages'], [200, 'Tome Keeper'], [365, 'Year in Ink']] },
  { id: 'ink-streak', category: 'mind', metric: (c) => c.stats.bestNoteStreak, describe: (t) => `Write notes ${t} days running.`,
    tiers: [[3, 'Ink Flowing'], [7, 'Daily Pages'], [14, 'Unbroken Ink'], [30, 'Monthly Scribe'], [60, 'Scribe of Two Moons'], [100, 'The Long Journal']] },
  { id: 'thinker', category: 'mind', metric: (c) => c.stats.criticalEntries, describe: (t) => `Write Extra Critical Thinking on ${plural(t, 'day')}.`,
    tiers: [[1, 'First Principles'], [5, 'Questioner'], [10, 'Skeptic'], [25, 'Analyst'], [50, 'Systems Thinker'], [100, 'Philosopher'], [250, 'Sage of Reason']] },
  { id: 'words', category: 'mind', metric: (c) => c.stats.wordsTotal, describe: (t) => `Write ${plural(t, 'word')} in total.`,
    tiers: [[100, 'First Hundred Words'], [500, 'Short Story'], [1000, 'Thousand Words'], [2500, 'Essayist'], [5000, 'Novelette'], [10000, 'Ten Thousand Words'], [25000, 'Novella'], [50000, 'Novelist'], [100000, 'Epic Author']] },
  { id: 'deep-dive', category: 'mind', metric: (c) => c.stats.longestEntryWords, describe: (t) => `Write ${t} words in a single note.`,
    tiers: [[100, 'Paragraph'], [250, 'Deep Dive'], [500, 'Long Read'], [1000, 'Manifesto']] },
  { id: 'dual-mind', category: 'mind', metric: (c) => c.stats.bothNotesDays, describe: (t) => `Fill in both notes on ${plural(t, 'day')}.`,
    tiers: [[1, 'Two Minds'], [7, 'Balanced Mind'], [30, 'Whole Mind'], [100, 'Enlightened']] },

  // ── Gold ──────────────────────────────────────────────────────────────
  { id: 'ledger', category: 'gold', metric: (c) => c.stats.spendLogged, describe: (t) => `Log ${plural(t, 'extra spending')} honestly.`,
    tiers: [[1, 'Honest Ledger'], [10, 'Bookkeeper'], [25, 'Accountant'], [50, 'Auditor'], [100, 'Treasurer'], [250, 'Master of Coin']] },
  { id: 'tightened', category: 'gold', metric: (c) => c.stats.monthsImproved, describe: (t) => `Spend less on extras than the month before, ${plural(t, 'time')}.`,
    tiers: [[1, 'Belt Tightened'], [2, 'Trending Down'], [3, 'Thrift Hat Trick'], [6, 'Half-Year Thrift'], [12, 'Year of Restraint']] },
  { id: 'no-spend', category: 'gold', metric: (c) => c.stats.noSpendDays, describe: (t) => `Go ${plural(t, 'day')} without an extra spending.`,
    tiers: [[7, 'Quiet Wallet'], [14, 'Locked Purse'], [30, 'Wallet Hibernation'], [60, "Dragon's Hoard"], [100, 'Ascetic'], [200, 'Monk of Coin']] },
  { id: 'lean-month', category: 'gold', dir: 'lte', metric: (c) => c.stats.bestMonthLeak, describe: (t) => t === 0 ? 'Finish a tracked month with no extra spending at all.' : `Finish a tracked month under ${dollars(t)} in extras.`,
    tiers: [[5000, 'Under Fifty', 'uncommon'], [2500, 'Under Twenty-Five', 'rare'], [1000, 'Under Ten', 'epic'], [0, 'Zero Leak Month', 'legendary']] },
  ...([
    ['coffee', 'Caffeine Accountant', 'coffee'],
    ['eating-out', 'Takeout Tracker', 'eating-out'],
    ['subscription', 'Subscription Sleuth', 'subscription'],
    ['impulse', 'Impulse Observer', 'impulse-buy'],
    ['entertainment', 'Fun Budgeter', 'entertainment'],
    ['other', 'Miscellany Master', 'miscellaneous'],
  ] as const).map(([cat, name, word]): Family => ({
    id: `aware-${cat}`, category: 'gold', metric: (c) => c.stats.categoryCounts[cat] ?? 0,
    describe: (t) => `Log ${t} ${word.replace('-', ' ')} extras. Awareness first.`, tiers: [[10, name, 'uncommon']],
  })),

  // ── Explorer ──────────────────────────────────────────────────────────
  { id: 'days', category: 'explorer', metric: (c) => c.stats.activeDays, describe: (t) => `Log anything on ${plural(t, 'day')}.`,
    tiers: [[1, 'Day One'], [3, 'Getting Started'], [7, 'First Week'], [14, 'Settling In'], [30, 'Resident'], [60, 'Local Legend'], [100, 'Hundred Days'], [200, 'Veteran Days'], [365, 'One Year'], [500, 'Five Hundred Days'], [730, 'Two Years']] },
  { id: 'check-in', category: 'explorer', metric: (c) => c.stats.bestActiveStreak, describe: (t) => `Log something ${t} days running.`,
    tiers: [[3, 'Showing Up'], [7, 'Daily Visitor'], [14, 'Habitual'], [30, 'Devoted'], [60, 'Faithful'], [100, 'Unwavering'], [200, 'Ever-Present'], [365, 'Eternal Presence']] },
  { id: 'comeback', category: 'explorer', metric: (c) => c.stats.comebacks, describe: (t) => `Come back after 3+ quiet days, ${plural(t, 'time')}. Rest counts too.`,
    tiers: [[1, 'The Comeback'], [3, 'Resilient'], [5, 'Phoenix']] },
  { id: 'full-party', category: 'explorer', metric: (c) => c.stats.fullPartyDays, describe: (t) => `Half your habits, all 5 meals, a note and no extras, on ${plural(t, 'day')}.`,
    tiers: [[1, 'Full Party'], [7, 'Party Week'], [30, 'Party Month'], [100, 'Legendary Party']] },
  { id: 'stylist', category: 'explorer', metric: (c) => c.themesTried.length, describe: (t) => `Try ${t} different themes.`,
    tiers: [[2, 'Window Shopper'], [4, 'Stylist'], [8, 'Shape Shifter'], [13, 'Collector of Worlds']] },
  ...([
    ['geek', 'Root Access'], ['bullet', 'Ink & Dots'], ['synthwave', 'Outrun'], ['manuscript', 'Illuminated'],
    ['brutalist', 'Concrete'], ['pocket', 'Insert Cartridge'], ['zen', 'Stillness'], ['blueprint', 'Drafted'],
    ['retro', 'Plug and Play'], ['cottage', 'Wildflower'], ['kawaii', 'Sparkle Mode'], ['abyss', 'Into the Deep'], ['ravenmoor', 'Night Watch'],
  ] as const).map(([id, name]): Family => ({
    id: `theme-${id}`, category: 'explorer', metric: (c) => (c.themesTried.includes(id) ? 1 : 0),
    describe: () => `Switch to the ${id === 'pocket' ? 'Pocket 8-bit' : id === 'retro' ? 'Retro OS' : id === 'bullet' ? 'Bullet Journal' : id[0].toUpperCase() + id.slice(1)} theme.`,
    tiers: [[1, name, 'common']],
  })),
  { id: 'quests', category: 'explorer', metric: (c) => c.questsCompleted, describe: (t) => `Complete ${plural(t, 'daily quest')}.`,
    tiers: [[1, 'Quest Accepted'], [10, 'Adventurer'], [25, 'Quester'], [50, 'Questmaster'], [100, 'Hundred Quests'], [250, 'Legend of the Board'], [500, 'Quest Eternal']] },
  { id: 'clear-board', category: 'explorer', metric: (c) => c.boardsCleared, describe: (t) => `Complete all 3 daily quests on ${plural(t, 'day')}.`,
    tiers: [[1, 'Board Cleared'], [7, 'Week Cleared'], [30, 'Month Cleared']] },

  // ── Legend ────────────────────────────────────────────────────────────
  { id: 'level', category: 'legend', metric: (c) => c.level, describe: (t) => `Reach level ${t}.`,
    tiers: [[2, 'Level 2'], [5, 'Apprentice'], [10, 'Adept'], [15, 'Journeyman'], [20, 'Champion'], [25, 'Warden'], [30, 'Paragon'], [40, 'Mythwalker'], [50, 'Ascendant'], [60, 'Exalted'], [75, 'Eternal'], [100, 'Stillpoint Sage']] },
  { id: 'xp', category: 'legend', metric: (c) => c.totalXp, describe: (t) => `Earn ${n(t)} XP.`,
    tiers: [[1000, 'First Thousand'], [5000, 'Five Thousand'], [10000, 'Ten Thousand'], [25000, 'Experienced'], [50000, 'Veteran Adventurer'], [100000, 'Hundred Thousand'], [250000, 'Living Legend'], [500000, 'Half a Million']] },
  { id: 'collector', category: 'legend', metric: (c) => c.unlockedCount, describe: (t) => `Earn ${t} achievements.`,
    // The last tier is "everything else"; it's set from the catalog size below.
    tiers: [[10, 'Collector'], [25, 'Trophy Shelf'], [50, 'Trophy Room'], [100, 'Hall of Fame'], [150, 'Museum'], [200, 'Pantheon'], [300, 'Nearly There'], [-1, 'Completionist']] },

  // ── Secrets (hidden until earned) ─────────────────────────────────────
  ...([
    ['01-01', 'Fresh Start', 'New Year’s Day'],
    ['02-14', 'Self Love', 'February 14'],
    ['02-29', 'Leap of Faith', 'a leap day'],
    ['03-14', 'Pi Day', 'March 14'],
    ['04-01', 'No Joke', 'April 1'],
    ['06-21', 'Longest Day', 'the June solstice'],
    ['09-13', "Programmer's Day", 'September 13'],
    ['10-31', 'Spooky Discipline', 'Halloween'],
    ['11-11', 'Eleven Eleven', 'November 11'],
    ['12-21', 'Longest Night', 'the December solstice'],
    ['12-31', "Year's End", 'New Year’s Eve'],
  ] as const).map(([md, name, when]): Family => ({
    id: `day-${md}`, category: 'secret', hidden: true, metric: (c) => (c.stats.activeMonthDays.has(md) ? 1 : 0),
    describe: () => `Log something on ${when}.`, tiers: [[1, name, 'rare']],
  })),
]

const rarityAt = (i: number, count: number): Rarity =>
  count === 1 ? 'uncommon' : RARITIES[Math.min(5, Math.floor((i / count) * 6 + (count <= 4 ? 1 : 0)))]

const TOTAL = FAMILIES.reduce((n, f) => n + f.tiers.length, 0)
for (const f of FAMILIES) for (const t of f.tiers) if (t[0] === -1) t[0] = TOTAL - 1

export const ACHIEVEMENTS: Achievement[] = FAMILIES.flatMap((f) =>
  f.tiers.map(([t, name, r], i) => {
    const rarity = r ?? rarityAt(i, f.tiers.length)
    return {
      id: `${f.id}-${t}`,
      name,
      description: f.describe(t),
      category: f.category,
      rarity,
      xp: RARITY_XP[rarity],
      hidden: !!f.hidden,
      metric: f.metric,
      target: t,
      dir: f.dir ?? 'gte',
    }
  }),
)

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

/** Achievements whose metric depends on XP/level/unlock count; evaluated last. */
export const META = new Set(['level', 'xp', 'collector'])
export const isMeta = (a: Achievement) => META.has(a.id.replace(/-\d+$/, ''))

export function isReached(a: Achievement, c: GameCtx): boolean {
  const v = a.metric(c)
  if (v === null) return false
  return a.dir === 'gte' ? v >= a.target : v <= a.target
}

export function progressOf(a: Achievement, c: GameCtx): number {
  const v = a.metric(c)
  if (v === null) return 0
  if (a.dir === 'lte') return v <= a.target ? 1 : Math.max(0, Math.min(0.95, a.target / Math.max(v, 1)))
  return Math.max(0, Math.min(1, v / a.target))
}
