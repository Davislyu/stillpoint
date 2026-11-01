/**
 * The treasure tables. Everything in a chest is generated from a seed, so a chest is fully described by
 * its key and nothing but the key is ever stored. Names combine rarity-graded adjectives, materials,
 * nouns and "of" endings, which gives tens of thousands of distinct things, plus hand-named legends.
 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
export type Category = 'trinket' | 'potion' | 'book' | 'relic' | 'toy' | 'food' | 'decor' | 'tool' | 'gem' | 'critter'

export const CATEGORY_LABEL: Record<Category, string> = {
  trinket: 'Trinkets', potion: 'Potions', book: 'Books & maps', relic: 'Relics', toy: 'Pet toys',
  food: 'Treats & food', decor: 'Den decor', tool: 'Tools', gem: 'Gems', critter: 'Critters',
}

/** name|emoji lists */
const N = (s: string) => s.split(',').map((x) => x.trim().split('|') as [string, string])
export const NOUNS: Record<Category, [string, string][]> = {
  trinket: N('Locket|📿,Pocket Watch|⌚,Compass|🧭,Signet Ring|💍,Music Box|🎶,Lucky Coin|🪙,Hourglass|⏳,Skeleton Key|🗝️,Lantern|🏮,Monocle|🧐,Bell|🔔,Quill|🪶,Pendant|📿,Charm Bracelet|⛓️,Brooch|🏵️,Thimble|🧵,Music Charm|🎵,Snow Globe|🔮,Hand Mirror|🪞,Wax Seal|🕯️'),
  potion: N('Tonic|🧪,Elixir|⚗️,Draught|🍶,Philter|🧴,Tincture|💧,Cordial|🍷,Brew|🍵,Vial|🧪,Syrup|🍯,Essence|🫧,Salve|🫙,Nectar|🍹'),
  book: N('Scroll|📜,Tome|📖,Atlas|🗺️,Grimoire|📕,Almanac|📘,Journal|📓,Songbook|🎼,Recipe Card|🍳,Star Chart|🌌,Field Guide|📗,Letter|✉️,Pressed Flower Book|🌸,Ledger|📒,Map Fragment|🧭'),
  relic: N('Idol|🗿,Totem|🪆,Chalice|🏆,Circlet|👑,Mask|🎭,Orb|🔮,Standard|🚩,Shield|🛡️,Dagger|🗡️,War Horn|📯,Censer|🪔,Reliquary|⚱️,Crest|🏅,Gauntlet|🧤,Amulet|🧿'),
  toy: N('Yarn Ball|🧶,Feather Wand|🪶,Squeaky Bone|🦴,Cushion|🛏️,Blanket|🧣,Bell Collar|🔔,Tiny Hat|🎩,Food Bowl|🥣,Rubber Duck|🦆,Tug Rope|🪢,Spinning Top|🪀,Kite|🪁,Jingle Ball|⚽,Tiny Scarf|🧣'),
  food: N('Honey Cake|🍰,Berry Tart|🥧,Dumpling|🥟,Stew|🍲,Loaf|🍞,Jam Jar|🍯,Cheese Wheel|🧀,Mushroom|🍄,Pear|🍐,Rice Ball|🍙,Spiced Pepper|🌶️,Pie|🥧,Fish Skewer|🍢,Pancake Stack|🥞,Soup|🥣,Cookie|🍪,Pretzel|🥨,Peach|🍑'),
  decor: N('Rug|🟫,Curtain|🪟,Candle|🕯️,Lamp|🪔,Potted Plant|🪴,Painting|🖼️,Wall Clock|🕰️,Chair|🪑,Mirror|🪞,Wind Chime|🎐,Banner|🎏,Teapot|🫖,Bookshelf|📚,Fireplace|🔥,Armchair|🛋️,Window Box|🌼,Hammock|🛌,Lantern String|🏮'),
  tool: N('Hammer|🔨,Lockpick|🗝️,Fishing Rod|🎣,Pickaxe|⛏️,Spyglass|🔭,Butterfly Net|🥅,Saw|🪚,Shovel|🪏,Paintbrush|🖌️,Sewing Needle|🪡,Brass Scales|⚖️,Magnifier|🔍,Watering Can|🚿,Trowel|🥄,Satchel|👜,Rope Coil|🪢'),
  gem: N('Ruby|♦️,Sapphire|🔷,Opal|🔹,Amber|🔶,Moonstone|⚪,Jade|🟩,Garnet|🔻,Pearl|🦪,Geode|🪨,Shard|💎,Emerald|💚,Topaz|🔸,Onyx|⚫,Quartz|💠'),
  critter: N('Moth|🦋,Beetle|🪲,Sparrow|🐦,Frog|🐸,Snail|🐌,Hedgehog|🦔,Bat|🦇,Firefly|✨,Newt|🦎,Bee|🐝,Owlet|🦉,Field Mouse|🐭,Ladybird|🐞,Hare|🐇,Duckling|🐥,Dormouse|🐹,Fawn|🦌,Otter|🦦,Tortoise|🐢'),
}

export const ADJECTIVES: Record<Rarity, string[]> = {
  common: 'Worn,Humble,Plain,Dusty,Simple,Mended,Chipped,Faded,Quiet,Little,Crooked,Tarnished,Lopsided,Hand-me-down,Everyday,Crumpled'.split(','),
  uncommon: 'Polished,Sturdy,Gilded,Painted,Fine,Warm,Etched,Bright,Lucky,Silver-threaded,Carved,Honeyed,Tidy,Cheerful,Woven,Weathered'.split(','),
  rare: 'Moonlit,Enchanted,Wandering,Embered,Singing,Gleaming,Velvet,Starlit,Whispering,Dewy,Mossy,Frostbitten,Radiant,Dreaming,Wistful,Gossamer'.split(','),
  epic: 'Ancient,Stormbound,Hallowed,Runed,Fey,Celestial,Phoenix,Obsidian,Thunderous,Aurora,Tidal,Eclipsed,Verdant,Emberheart,Tempest,Sunken'.split(','),
  legendary: 'Eternal,Sovereign,Mythic,Worldtree,Starforged,First-Light,Dragonheart,Everbright,Timeless,Cosmic,Unbroken,Last-Dawn'.split(','),
}
export const MATERIALS: Record<Rarity, string[]> = {
  common: 'oak,birch,clay,linen,wool,tin,slate,straw,cork,pine,felt,cotton'.split(','),
  uncommon: 'brass,copper,leather,pewter,willow,cedar,porcelain,bone,glass,wax,cotton-silk,bamboo'.split(','),
  rare: 'silver,amber,jade,ivory,velvet,marble,crystal,moss,seashell,feather,rosewood,lacquer'.split(','),
  epic: 'gold,obsidian,moonsilver,opal,ironwood,sunstone,coral,starglass,emberglass,pearl'.split(','),
  legendary: 'starlight,dragonscale,mithril,dawnfire,aether,phoenix-ash,worldroot'.split(','),
}
export const OF: string[] = [
  'of Small Mercies','of the Quiet Hour','of Long Roads','of the Lantern Fen','of Morning Frost','of Honey and Smoke','of the Patient Fox',
  'of Distant Bells','of the Last Ember','of Tidy Habits','of Second Wind','of Warm Hands','of Deep Water','of Bright Mornings',
  'of the Sleeping Wyrm','of Old Friends','of Soft Rain','of Steady Steps','of the Hollow Moon','of Open Windows','of Clever Thoughts',
  'of Gentle Thunder','of the Seventh Day','of Spare Change','of Tiny Victories','of the Night Market','of Kept Promises',
  'of the Glasswood','of the Frozen Lake','of Cinder and Sage','of Wandering Stars','of the First Snow','of Good Weather','of the Hearth',
  'of Second Breakfast','of Fine Print','of the Ninth Bell','of Quiet Courage','of Lazy Sundays','of the Long Night',
]

/** Hand-named one-of-a-kind finds; any legendary roll has a chance to be one. */
export const LEGENDS: { name: string; emoji: string; category: Category; flavor: string }[] = [
  { name: 'The Kettle That Never Cools', emoji: '🫖', category: 'tool', flavor: 'Every cup tastes like the best day you have had.' },
  { name: 'Crown of Small Hours', emoji: '👑', category: 'relic', flavor: 'It fits whoever kept going.' },
  { name: 'Map of Everywhere You Will Be', emoji: '🗺️', category: 'book', flavor: 'The ink is still drying.' },
  { name: 'Hourglass of the Patient Fox', emoji: '⏳', category: 'trinket', flavor: 'The sand falls upward when you are not looking.' },
  { name: 'Lantern of Last Light', emoji: '🏮', category: 'tool', flavor: 'It burns brightest when you are tired.' },
  { name: 'The Quiet Sword', emoji: '🗡️', category: 'relic', flavor: 'It has never been drawn, and every monster knows.' },
  { name: 'Moonlit Wishing Well', emoji: '⛲', category: 'decor', flavor: 'Coins go in. Good habits come out.' },
  { name: 'Phoenix Feather Quill', emoji: '🪶', category: 'tool', flavor: 'Everything it writes comes back, warmer.' },
  { name: 'Heart of the Hollow Oak', emoji: '🌳', category: 'relic', flavor: 'Plant it anywhere and the room grows kinder.' },
  { name: 'The Last Dragon Egg (Sleeping)', emoji: '🥚', category: 'critter', flavor: 'Warm to the touch. Dreaming of workouts.' },
  { name: 'Cloak of Ten Thousand Mornings', emoji: '🧥', category: 'relic', flavor: 'Smells of toast and open windows.' },
  { name: 'Orrery of Small Victories', emoji: '🪐', category: 'decor', flavor: 'One tiny planet for every day you did the thing.' },
  { name: 'The Unspilled Cup', emoji: '🏆', category: 'relic', flavor: 'Full for as long as you keep walking.' },
  { name: 'Starlit Hammock', emoji: '🛌', category: 'decor', flavor: 'Naps taken here count as training.' },
  { name: 'Songbird of Dawn', emoji: '🐦', category: 'critter', flavor: 'Sings only on days you showed up.' },
  { name: 'Tome of Gentle Rules', emoji: '📖', category: 'book', flavor: 'The only rule is: begin again.' },
  { name: 'Aurora in a Jar', emoji: '🫙', category: 'potion', flavor: 'Do not shake. Do enjoy.' },
  { name: 'Fox-Fire Brazier', emoji: '🔥', category: 'decor', flavor: 'Warms the whole den, and anyone passing.' },
  { name: 'The Winter Sun', emoji: '🌞', category: 'gem', flavor: 'A pocket-sized midday in the middle of the long night.' },
  { name: 'Compass That Points to Home', emoji: '🧭', category: 'trinket', flavor: 'Even when you are not lost.' },
]

export const FLAVOR: Record<Category, string[]> = {
  trinket: ['Warm from a pocket that is not yours.', 'It ticks when you are doing well.', 'Someone loved this once, and it shows.', 'Engraved: "keep going".'],
  potion: ['Smells of rain and cinnamon.', 'Fizzes quietly on good days.', 'Do not drink before a workout. Do drink after.', 'The label is in a handwriting you almost recognise.'],
  book: ['Dog-eared at the best page.', 'Smells like a library at dusk.', 'The margins argue with each other.', 'Half the pages are blank. They are for you.'],
  relic: ['It hums at a very low pitch.', 'Cold, heavy, patient.', 'Older than the monsters, and prouder.', 'Every scratch is a story you are about to hear.'],
  toy: ['Your pet will pretend not to like it.', 'Chewed, loved, indestructible.', 'Squeaks at precisely the wrong time.', 'Already covered in tiny paw prints.'],
  food: ['Still warm, somehow.', 'Tastes like someone cared.', 'Best shared. Eaten alone anyway.', 'Smells like a Sunday.'],
  decor: ['Makes the den feel lived in.', 'Fits the corner no one knew was empty.', 'Cosy in a way that is hard to explain.', 'Pairs well with rain on the window.'],
  tool: ['Well balanced, well loved.', 'The handle is worn to the shape of a hand.', 'Does one job and does it right.', 'Smells of oil and good intentions.'],
  gem: ['Catches light from a window that is not there.', 'Holds a tiny storm.', 'Warm on the side that faces your heart.', 'Looks different every time you look.'],
  critter: ['It follows you for a few steps, then pretends it did not.', 'Smaller than it looked in the grass.', 'Hums when you are doing well.', 'Has opinions about your breakfast.'],
}

export const RARITY_XP: Record<Rarity, number> = { common: 4, uncommon: 10, rare: 25, epic: 60, legendary: 150 }
export const RARITY_COLOR: Record<Rarity, string> = {
  common: 'var(--muted)', uncommon: 'var(--accent-sage)', rare: 'var(--accent-dusk)', epic: 'var(--accent-mauve)', legendary: 'var(--accent-sand)',
}
