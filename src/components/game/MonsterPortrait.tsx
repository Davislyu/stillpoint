import type { Monster, MonsterKind, Tier } from '../../game/bestiary'

/** Original silhouettes, one per monster kind. Body uses currentColor; eyes glow in the tier colour. */
const BODY: Record<MonsterKind, string> = {
  knight:
    'M32 3c5 1 8 4 8 8h-8zM22 12h20a4 4 0 014 4v13l-6 6H24l-6-6V16a4 4 0 014-4zM10 62V44c2-7 8-10 15-10h14c7 0 13 3 15 10v18zM51 8h2v40h-2zM47 42h10v3H47z',
  wraith:
    'M32 3C19 3 14 15 14 27c0 14-5 23-10 33l8-3 4 4 5-4 5 4 6-4 6 4 5-4 4 4 8 3c-5-10-10-19-10-33C50 15 45 3 32 3z',
  skeleton:
    'M32 4c-10 0-16 7-16 15 0 6 3 9 6 11v6h20v-6c3-2 6-5 6-11 0-8-6-15-16-15zM26 38h12v3H26zM20 44h24v3H20zM18 50h28v3H18zM20 56h24v3H20zM30 38h4v24h-4z',
  beast:
    'M6 52c2-14 10-22 22-24 4-10 12-15 20-12 8 3 10 11 8 18 5 5 5 12 3 18h-6l-2-6-4 6h-6l-2-7H26l-4 7h-6l-1-6-4 6z',
  witch:
    'M32 2l12 22c5 10 7 24 5 38H15c-2-14 0-28 5-38zM8 18h2v44H8zM9 12a4 4 0 110 8 4 4 0 010-8z',
  bat:
    'M32 22c3 0 5 3 5 6 6-6 15-9 25-5-5 3-6 7-6 11-4-2-8-1-10 3-2-3-6-4-9-2-1 4-3 7-5 9-2-2-4-5-5-9-3-2-7-1-9 2-2-4-6-5-10-3 0-4-1-8-6-11 10-4 19-1 25 5 0-3 2-6 5-6zM29 22l-1-5 3 3h2l3-3-1 5z',
  gargoyle:
    'M18 8l6 8h16l6-8 1 12c3 3 4 7 4 11l10-6-3 14-7 3v20H13V42l-7-3-3-14 10 6c0-4 1-8 4-11z',
  dragon:
    'M4 30c8-10 20-14 32-12l6-12 3 12 7-8-1 12c6 4 9 10 9 16-8 2-16 1-22-2l-6 8-4-8c-8 2-16 0-24-4zM20 40l-2 10 6-6zM30 42l1 10 4-8z',
  lich:
    'M20 10l4 5 4-8 4 8 4-8 4 8 4-5v8H20zM32 18c-9 0-14 6-14 13 0 5 3 9 7 10v4h14v-4c4-1 7-5 7-10 0-7-5-13-14-13zM10 62c2-10 8-16 16-17h12c8 1 14 7 16 17z',
  vampire:
    'M32 10c-7 0-11 5-11 12 0 6 4 11 11 11s11-5 11-11c0-7-4-12-11-12zM8 62c0-14 4-24 10-30l6 6c2 3 5 4 8 4s6-1 8-4l6-6c6 6 10 16 10 30zM14 30l-6-10 12 8zM50 30l6-10-12 8z',
}

/** Eye positions per kind. */
const EYES: Record<MonsterKind, [number, number][]> = {
  knight: [[28, 21], [36, 21]],
  wraith: [[27, 22], [37, 22]],
  skeleton: [[26, 18], [38, 18]],
  beast: [[46, 22]],
  witch: [[29, 26], [35, 26]],
  bat: [[30, 27], [34, 27]],
  gargoyle: [[27, 24], [37, 24]],
  dragon: [[38, 22]],
  lich: [[27, 30], [37, 30]],
  vampire: [[28, 21], [36, 21]],
}

const TIER_GLOW: Record<Tier, string> = { minion: 'var(--accent-clay)', elite: 'var(--accent-mauve)', boss: 'var(--accent-sand)' }

interface Props {
  monster: Monster
  size?: number
  slain?: boolean
  /** Unknown (bestiary): draw as a dark silhouette. */
  hidden?: boolean
  className?: string
}

export function MonsterPortrait({ monster, size = 96, slain, hidden, className = '' }: Props) {
  const glow = TIER_GLOW[monster.tier]
  const id = `mg-${monster.id}`
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={`monster-portrait shrink-0 ${slain ? 'opacity-35 grayscale' : ''} ${className}`}
    >
      <defs>
        <radialGradient id={id} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={hidden ? 'transparent' : glow} stopOpacity="0.28" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx={monster.tier === 'boss' ? 6 : 32} fill={`url(#${id})`} />
      {monster.tier !== 'minion' && !hidden && (
        <rect x="1.5" y="1.5" width="61" height="61" rx={monster.tier === 'boss' ? 6 : 30.5} fill="none" stroke={glow} strokeWidth="1.2" strokeDasharray={monster.tier === 'elite' ? '3 3' : undefined} opacity="0.7" />
      )}
      <path d={BODY[monster.kind]} fill="currentColor" fillRule="evenodd" opacity={hidden ? 0.25 : 0.92} />
      {!hidden && !slain &&
        EYES[monster.kind].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" fill={glow} className="monster-eye">
            <animate attributeName="opacity" values="1;0.35;1" dur="3.2s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
          </circle>
        ))}
      {slain && <path d="M14 14l36 36M50 14L14 50" stroke="var(--accent-clay)" strokeWidth="3" strokeLinecap="round" opacity="0.9" />}
    </svg>
  )
}
