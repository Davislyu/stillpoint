import type { Species } from './types'

/**
 * Pixel sprites, 16x16. Heads and bodies are drawn as a mirrored left half; tails, wings and
 * ears are overlays. Palette keys: o outline, b base, l light, d dark, e eye, n nose, k cheek, h horn/orb.
 */
type Pal = Record<string, string>

const HALF = [
  '........', // 0
  '........', // 1 ear
  '........', // 2 ear
  '..oooooo', // 3
  '.obbbbbb', // 4
  'obbbbbbb', // 5
  'obbebbbb', // 6
  'obkbblll', // 7
  'obbblllo', // 8  (col 7 = nose seam, replaced below)
  '.obbllll', // 9
  '..oooooo', // 10
  '..obbbll', // 11
  '..obblll', // 12
  '..obblll', // 13
  '..ooo.oo', // 14
]

interface Def {
  pal: Pal
  ears: [string, string, string] // rows 0..2 of the left half
  overlay: [number, number, string][]
  body?: Record<number, string> // replace left-half rows
}

const px = (list: string): [number, number, string][] =>
  list
    .trim()
    .split(/\s+/)
    .map((t) => {
      const [x, y, c] = t.split(',')
      return [Number(x), Number(y), c]
    })

const DEFS: Record<Species, Def> = {
  fox: {
    pal: { o: '#4a2433', b: '#f29b4b', l: '#fff0d6', d: '#c4652a', e: '#2b1a28', n: '#4a2433', k: '#ff9aa2' },
    ears: ['..o.....', '.odo....', '.odbo...'],
    overlay: px('14,9,o 13,10,o 14,10,l 15,10,o 13,11,o 14,11,b 15,11,o 13,12,o 14,12,b 15,12,o 13,13,o 14,13,d 15,13,o 14,14,o'),
  },
  cat: {
    pal: { o: '#2f2a55', b: '#a9b4e6', l: '#f4f0ff', d: '#6d78b0', e: '#241f45', n: '#e58aa8', k: '#ffb0c8' },
    ears: ['.oo.....', '.odoo...', '.odbbo..'],
    overlay: px('13,12,o 14,11,o 15,10,o 14,12,b 15,11,b 13,13,o 14,13,b 15,12,o 12,14,o 13,14,o'),
  },
  dragon: {
    pal: { o: '#1f4a3a', b: '#7fd6a0', l: '#eaffd9', d: '#4aa56f', e: '#16302a', n: '#1f4a3a', k: '#ffc38a', h: '#ffd37a' },
    ears: ['.h......', '.hh.....', '..ho....'],
    overlay: px('0,9,o 1,9,d 0,10,o 1,10,d 2,10,o 0,11,o 1,11,d 14,9,d 15,9,o 13,10,o 14,10,d 15,10,o 14,11,d 15,11,o 14,12,o 15,13,o 14,13,d 13,13,o 14,14,o 15,14,h'),
  },
  spirit: {
    pal: { o: '#3a4f8f', b: '#bfe9ff', l: '#ffffff', d: '#8fc4f0', e: '#243060', n: '#8fc4f0', k: '#ffc6e6', h: '#ffd37a' },
    ears: ['...h....', '...o....', '..oo....'],
    overlay: px('6,1,h 7,0,h 8,0,h 9,1,h'),
    body: { 14: '..o.oo.o' },
  },
}

/** Returns a 16x16 grid of palette keys ('' = empty). */
export function spriteGrid(species: Species): string[][] {
  const def = DEFS[species]
  const rows = HALF.map((r, i) => (i < 3 ? def.ears[i] : def.body?.[i] ?? r))
  const grid = rows.map((half) => {
    const chars = half.split('')
    const mirror = [...chars].reverse()
    return [...chars, ...mirror].map((c) => (c === '.' ? '' : c))
  })
  // The seam column pair is the nose.
  grid[8][7] = 'n'
  grid[8][8] = 'n'
  for (const [x, y, c] of def.overlay) grid[y][x] = c
  return grid
}

export const palette = (species: Species): Pal => DEFS[species].pal
export const EYE_CELLS = [
  [3, 6],
  [12, 6],
] as const

export const SPECIES_INFO: Record<Species, { label: string; blurb: string; trait: string }> = {
  fox: { label: 'Ember Fox', blurb: 'Curious and quick. Loves a tidy streak.', trait: 'Thrives on habits' },
  cat: { label: 'Moon Cat', blurb: 'Calm, nocturnal, quietly proud of you.', trait: 'Thrives on notes' },
  dragon: { label: 'Hatchling Drake', blurb: 'Small, loud, and sure it is huge.', trait: 'Thrives on workouts' },
  spirit: { label: 'Wisp', blurb: 'A soft little light that follows you around.', trait: 'Thrives on rest' },
}
