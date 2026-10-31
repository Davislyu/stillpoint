import type { Category, Rarity } from '../../game/achievements'

export const RARITY_COLOR: Record<Rarity, string> = {
  common: 'var(--muted)',
  uncommon: 'var(--accent-sage)',
  rare: 'var(--accent-dusk)',
  epic: 'var(--accent-mauve)',
  legendary: 'var(--accent-sand)',
  mythic: 'var(--accent-clay)',
}

/** Rarer badges get more sides: circle, hexagon, octagon, star... */
const SHAPE: Record<Rarity, string> = {
  common: 'M24 4a20 20 0 110 40 20 20 0 010-40z',
  uncommon: 'M24 4l17.3 10v20L24 44 6.7 34V14z',
  rare: 'M24 3l14.8 6.2L45 24l-6.2 14.8L24 45 9.2 38.8 3 24 9.2 9.2z',
  epic: 'M24 2l6 9.5 10.9-2.4-2.4 10.9L48 24l-9.5 6 2.4 10.9-10.9-2.4L24 48l-6-9.5-10.9 2.4 2.4-10.9L0 24l9.5-6L7.1 7.1 18 9.5z',
  legendary: 'M24 1l5.6 15.1H45.7L32.6 25.6l5 15.4L24 31.6 10.4 41l5-15.4L2.3 16.1h16.1z',
  mythic: 'M24 1l4.3 9.6 10-3.3-3.3 10 9.6 4.3-9.6 4.3 3.3 10-10-3.3L24 47l-4.3-9.6-10 3.3 3.3-10L3.4 26.4l9.6-4.3-3.3-10 10 3.3z',
}

const ICON: Record<Category, string> = {
  habits: 'M17 24.5l4.6 4.6L31 19.6',
  body: 'M15 22h18a9 9 0 01-18 0zM19 17c0-2 2-2 2-4M24 17c0-2 2-2 2-4M29 17c0-2 2-2 2-4',
  training: 'M14 21v6M17 18v12M31 18v12M34 21v6M17 24h14',
  mind: 'M30 15l-11 11-2 6 6-2 11-11zM28 17l3 3',
  gold: 'M24 15v18M28.5 18.5c-1-1.3-2.6-2-4.5-2-2.5 0-4.2 1.3-4.2 3.2 0 4.5 8.7 2.4 8.7 6.8 0 2-1.8 3.4-4.5 3.4-2 0-3.6-.8-4.6-2.2',
  explorer: 'M24 14a10 10 0 110 20 10 10 0 010-20zM28 20l-2.5 6.5L19 29l2.5-6.5z',
  legend: 'M15 30h18M16 30l-1.5-11 5.5 4.5L24 16l4 7.5 5.5-4.5L32 30',
  secret: 'M21 20a3.5 3.5 0 116 2.4c-1.3 1-3 1.7-3 3.6M24 30v.5',
}

export function Badge({ rarity, category, locked, size = 48 }: { rarity: Rarity; category: Category; locked?: boolean; size?: number }) {
  const color = locked ? 'var(--line-strong)' : RARITY_COLOR[rarity]
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className={`badge shrink-0 ${locked ? 'opacity-60' : ''}`}>
      <path d={SHAPE[rarity]} fill={locked ? 'none' : color} fillOpacity={0.18} stroke={color} strokeWidth={locked ? 1.2 : 2} strokeDasharray={locked ? '3 3' : undefined} strokeLinejoin="round" />
      <path d={ICON[category]} fill="none" stroke={locked ? 'var(--muted)' : color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
