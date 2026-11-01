import { useMemo } from 'react'
import { palette, spriteGrid } from './sprites'
import type { AccessoryId } from './care'
import type { Species } from './types'

const px = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((t) => t.split(','))

const ACC: Record<AccessoryId, { color: Record<string, string>; pixels: [number, number, string][] }> = {
  bow: {
    color: { p: '#ff7eb6', q: '#ffd0e6' },
    pixels: px('11,2,p 12,2,q 13,2,p 12,3,p').map(([x, y, c]) => [Number(x), Number(y), c] as [number, number, string]),
  },
  scarf: {
    color: { r: '#e5533d', s: '#ffb36b' },
    pixels: px('3,10,r 4,10,s 5,10,r 6,10,s 7,10,r 8,10,s 9,10,r 10,10,s 11,10,r 12,10,s 11,11,r 11,12,s').map(([x, y, c]) => [Number(x), Number(y), c] as [number, number, string]),
  },
  hat: {
    color: { v: '#6a4bc4', w: '#8c6ee6', y: '#ffd37a' },
    pixels: px('7,0,y 7,1,v 8,1,v 6,2,v 7,2,w 8,2,w 9,2,v 5,3,v 6,3,v 7,3,v 8,3,v 9,3,v 10,3,v').map(([x, y, c]) => [Number(x), Number(y), c] as [number, number, string]),
  },
  crown: {
    color: { g: '#ffd37a', j: '#ff6f91' },
    pixels: px('5,2,g 7,2,g 8,2,g 10,2,g 5,3,g 6,3,j 7,3,g 8,3,g 9,3,j 10,3,g').map(([x, y, c]) => [Number(x), Number(y), c] as [number, number, string]),
  },
}

interface Props {
  species: Species
  mood?: 'happy' | 'ok' | 'sad' | 'sleep'
  accessory?: AccessoryId | null
  /** Seasonal colour, worn once you have three stars. */
  charm?: string | null
  size?: number
  className?: string
}

/** A 16x16 pixel pet drawn as crisp SVG squares. */
export function PetSprite({ species, mood = 'ok', accessory = null, charm = null, size = 64, className = '' }: Props) {
  const rects = useMemo(() => {
    const pal = palette(species)
    const grid = spriteGrid(species).map((r) => [...r])
    const set = (x: number, y: number, c: string) => {
      if (grid[y]?.[x] !== undefined) grid[y][x] = c
    }
    // Expressions: eyes live at (3,6) and (12,6).
    for (const [ex, dir] of [[3, 1], [12, -1]] as const) {
      if (mood === 'happy') {
        set(ex, 6, 'b')
        set(ex - 1, 6, 'e')
        set(ex, 5, 'e')
        set(ex + 1, 6, 'e')
      } else if (mood === 'sleep') {
        set(ex - 1, 6, 'e')
        set(ex + 1, 6, 'e')
      } else if (mood === 'sad') {
        set(ex, 7, 't')
        set(ex + dir, 5, 'e')
      }
    }
    const out: { x: number; y: number; fill: string }[] = []
    const accDef = accessory ? ACC[accessory] : null
    grid.forEach((row, y) =>
      row.forEach((c, x) => {
        if (!c) return
        out.push({ x, y, fill: c === 't' ? '#8fb4ff' : pal[c] ?? '#fff' })
      }),
    )
    if (charm) for (const [x, y] of [[1, 5], [0, 6], [1, 6], [2, 6], [1, 7]] as const) out.push({ x, y, fill: charm })
    if (accDef) for (const [x, y, c] of accDef.pixels) out.push({ x, y, fill: accDef.color[c] })
    return out
  }, [species, mood, accessory, charm])

  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={`pixel ${className}`} shapeRendering="crispEdges" aria-hidden="true">
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width="1.02" height="1.02" fill={r.fill} />
      ))}
    </svg>
  )
}

const EGG = [
  '....oooo....',
  '...obbbbo...',
  '..obbwbbbo..',
  '..obbbbbbo..',
  '.obbbpbbbbo.',
  '.obbbbbbpbo.',
  '.obpbbbbbbo.',
  '..obbbbbbo..',
  '...oooooo...',
]
/** The unhatched egg shown before you adopt. */
export function EggSprite({ size = 48, className = '' }: { size?: number; className?: string }) {
  const colors: Record<string, string> = { o: '#4a3a6e', b: '#fff0d6', w: '#ffffff', p: '#e79ad8' }
  return (
    <svg viewBox="0 0 12 9" width={size} height={(size * 9) / 12} className={`pixel ${className}`} shapeRendering="crispEdges" aria-hidden="true">
      {EGG.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={colors[c]} />)))}
    </svg>
  )
}
