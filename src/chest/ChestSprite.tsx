import type { ChestTier } from './chest'

const PAL: Record<ChestTier, Record<string, string>> = {
  0: { o: '#2a1a12', b: '#9a6b3f', d: '#6f4a2a', h: '#c9a15a', l: '#ffd37a' },
  1: { o: '#1f2a44', b: '#8fa3c8', d: '#5d6f94', h: '#dfe8ff', l: '#ffffff' },
  2: { o: '#4a3410', b: '#e0b34a', d: '#a67c1f', h: '#fff0a6', l: '#ff6f91' },
}
const CLOSED = [
  '..oooooooooooo..',
  '.obbbbbbbbbbbbo.',
  'obbbbbbbbbbbbbbo',
  'ohhhhhhhhhhhhhho',
  'oooooooooooooooo',
  'obbbbbbllbbbbbbo',
  'obbbbbbllbbbbbbo',
  'obbbbbbbbbbbbbbo',
  'oddddddddddddddo',
  '.oooooooooooooo.',
]
const OPEN = [
  '..oooooooooooo..',
  '.obbbbbbbbbbbbo.',
  '.ohhhhhhhhhhhho.',
  '..oooooooooooo..',
  'oooooooooooooooo',
  'oggggggggggggggo',
  'oggggggllggggggo',
  'obbbbbbbbbbbbbbo',
  'oddddddddddddddo',
  '.oooooooooooooo.',
]

/** A 16-px treasure chest in three metals; open it and the inside glows. */
export function ChestSprite({ tier, open = false, size = 96, dim = false, className = '' }: { tier: ChestTier; open?: boolean; size?: number; dim?: boolean; className?: string }) {
  const pal: Record<string, string> = { ...PAL[tier], g: '#fff6c8' }
  const rows = open ? OPEN : CLOSED
  return (
    <svg viewBox="0 0 16 10" width={size} height={(size * 10) / 16} className={`pixel ${className}`} style={{ opacity: dim ? 0.45 : 1, filter: dim ? 'grayscale(0.7)' : undefined }} shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={pal[c] ?? '#fff'} />)))}
    </svg>
  )
}
