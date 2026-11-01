import { useEffect, useState } from 'react'
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
  slime:
    'M8 54c0-16 8-28 24-28s24 12 24 28c0 3-3 5-6 5H14c-3 0-6-2-6-5zM28 12c4 3 6 8 4 14h-6c-2-5-1-10 2-14z',
  mushroom:
    'M8 34C8 18 18 8 32 8s24 10 24 26c0 3-2 4-4 4H12c-2 0-4-1-4-4zM23 40h18l2 20H21z',
  spider:
    'M32 24c7 0 11 5 11 11s-4 12-11 12-11-6-11-12 4-11 11-11zM27 17a5 5 0 1010 0 5 5 0 00-10 0zM21 30L6 18l-2 3 14 14zM21 36L4 38v3l18-1zM22 42L8 56l3 2 14-12zM43 30l15-12 2 3-14 14zM43 36l17 2v3l-18-1zM42 42l14 14-3 2-12-12z',
  owl:
    'M16 12l8 6h16l8-6v18c4 4 6 9 6 15 0 10-8 17-22 17S10 55 10 45c0-6 2-11 6-15z',
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
  slime: [[25, 40], [39, 40]],
  mushroom: [[27, 49], [37, 49]],
  spider: [[29, 36], [35, 36]],
  owl: [[24, 30], [40, 30]],
}


interface Props {
  monster: Monster
  size?: number
  slain?: boolean
  /** Unknown (bestiary): draw as a dark silhouette. */
  hidden?: boolean
  className?: string
}

const cssVar = (name: string, fallback: string) => {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
const GLOW_VAR: Record<Tier, string> = { minion: '--accent-clay', elite: '--accent-mauve', boss: '--accent-sand' }
const REGION_TINT: Record<string, [string, string]> = {
  ravenmoor: ['#3a2630', '#0d0a12'],
  emberfen: ['#4a2e1c', '#120a07'],
  glasswood: ['#1f3b36', '#07110f'],
  frostmere: ['#27415e', '#080e18'],
}
const cache = new Map<string, string>()

/**
 * Real artwork slot. Drop <id>.webp files into public/monsters/ and list the ids in
 * public/monsters/manifest.json (a JSON array); those monsters then use the artwork,
 * everything else keeps the painted fallback below. One small fetch, no 404 spam.
 */
let manifest: Promise<Set<string>> | null = null
const artIds = () =>
  (manifest ??= fetch('/monsters/manifest.json')
    .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : []))
    .then((l: unknown) => new Set(Array.isArray(l) ? l.filter((x): x is string => typeof x === 'string') : []))
    .catch(() => new Set<string>()))
const seedOf = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7)

/**
 * A lit, textured painting of the monster: moody region sky, volumetric fog, a body with
 * real surface relief (noise + diffuse and specular lighting), a rim light, glowing eyes and
 * a ground shadow.
 */
export function paintSvg(monster: Monster, hidden: boolean, slain: boolean, glow: string): string {
  const [skyA, skyB] = REGION_TINT[monster.region] ?? REGION_TINT.ravenmoor
  const seed = seedOf(monster.id)
  const body = BODY[monster.kind]
  const eyes = hidden || slain ? '' : EYES[monster.kind].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${glow}" filter="url(#glow)"/><circle cx="${x}" cy="${y}" r="1.2" fill="#fff"/>`).join('')
  const bodyFill = hidden ? '#0a0a0e' : `url(#skin)`
  const bossCrown = monster.tier === 'boss' ? `<ellipse cx="32" cy="30" rx="30" ry="30" fill="url(#aura)"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs>
 <radialGradient id="sky" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${skyA}"/><stop offset="1" stop-color="${skyB}"/></radialGradient>
 <radialGradient id="aura" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${glow}" stop-opacity=".38"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
 <linearGradient id="skin" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#8d8a92"/><stop offset=".45" stop-color="#4a4650"/><stop offset="1" stop-color="#17141b"/></linearGradient>
 <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#cfd8e8" stop-opacity=".5"/></linearGradient>
 <filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.2"/></filter>
 <filter id="soft"><feGaussianBlur stdDeviation="1.4"/></filter>
 <filter id="lit" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="${seed}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0 -0.55" result="na"/>
  <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="b"/>
  <feComposite in="b" in2="na" operator="arithmetic" k1="0" k2="1" k3="0.5" k4="0" result="h"/>
  <feDiffuseLighting in="h" surfaceScale="3.2" diffuseConstant="1.15" lighting-color="#e9e2f4" result="d"><feDistantLight azimuth="225" elevation="42"/></feDiffuseLighting>
  <feSpecularLighting in="h" surfaceScale="3.2" specularConstant="0.9" specularExponent="24" lighting-color="#fff6e0" result="s"><feDistantLight azimuth="225" elevation="42"/></feSpecularLighting>
  <feComposite in="d" in2="SourceGraphic" operator="arithmetic" k1="1.15" k2="0" k3="0" k4="0" result="dm"/>
  <feComposite in="s" in2="SourceAlpha" operator="in" result="sm"/>
  <feBlend in="dm" in2="sm" mode="screen" result="out"/>
  <feComposite in="out" in2="SourceAlpha" operator="in"/>
 </filter>
 <filter id="rim" x="-10%" y="-10%" width="120%" height="120%"><feOffset in="SourceAlpha" dx="-1.3" dy="-1.3" result="o"/><feComposite in="SourceAlpha" in2="o" operator="out" result="edge"/><feGaussianBlur in="edge" stdDeviation=".5"/><feFlood flood-color="${glow}" flood-opacity=".9"/><feComposite in2="edge" operator="in"/></filter>
 <clipPath id="frame"><rect width="64" height="64" rx="${monster.tier === 'boss' ? 5 : 32}"/></clipPath>
</defs>
<g clip-path="url(#frame)">
 <rect width="64" height="64" fill="url(#sky)"/>
 ${bossCrown}
 <ellipse cx="32" cy="60" rx="22" ry="3.4" fill="#000" opacity=".55" filter="url(#soft)"/>
 <g opacity="${slain ? 0.4 : 1}">
  <path d="${body}" fill-rule="evenodd" fill="${hidden ? '#0a0a0e' : '#000'}" transform="translate(1.4 1.8)" opacity=".55" filter="url(#soft)"/>
  <path d="${body}" fill-rule="evenodd" fill="${bodyFill}" ${hidden ? '' : 'filter="url(#lit)"'}/>
  ${hidden ? '' : `<path d="${body}" fill-rule="evenodd" fill="#fff" filter="url(#rim)" opacity=".8"/>`}
  ${eyes}
 </g>
 <rect y="34" width="64" height="30" fill="url(#fog)"/>
 ${slain ? `<path d="M14 14l36 36M50 14L14 50" stroke="${glow}" stroke-width="3.5" stroke-linecap="round" opacity=".9"/>` : ''}
</g>
${monster.tier !== 'minion' && !hidden ? `<rect x="1" y="1" width="62" height="62" rx="${monster.tier === 'boss' ? 5 : 31}" fill="none" stroke="${glow}" stroke-width="1.2" ${monster.tier === 'elite' ? 'stroke-dasharray="3 3"' : ''} opacity=".8"/>` : ''}
</svg>`
}

function paintUrl(monster: Monster, hidden: boolean, slain: boolean): Promise<string> {
  const glow = cssVar(GLOW_VAR[monster.tier], '#f90')
  const key = `${monster.id}|${hidden}|${slain}|${glow}`
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const N = 256
      const c = document.createElement('canvas')
      c.width = c.height = N
      const g = c.getContext('2d')
      if (!g) return resolve('')
      g.drawImage(img, 0, 0, N, N)
      const url = c.toDataURL('image/webp', 0.92)
      cache.set(key, url)
      resolve(url)
    }
    img.onerror = () => resolve('')
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(paintSvg(monster, hidden, slain, glow))}`
  })
}

export function MonsterPortrait({ monster, size = 96, slain = false, hidden = false, className = '' }: Props) {
  const [url, setUrl] = useState('')
  const [art, setArt] = useState(false)
  useEffect(() => {
    let live = true
    void artIds().then((ids) => live && setArt(!hidden && !slain && ids.has(monster.id)))
    void paintUrl(monster, hidden, slain).then((u) => live && setUrl(u))
    return () => {
      live = false
    }
  }, [monster, hidden, slain])
  return url ? (
    <img src={art ? `/monsters/${monster.id}.webp` : url} alt="" width={size} height={size} draggable={false} className={`shrink-0 ${hidden || slain ? '' : 'monster-art'} ${className}`} style={{ borderRadius: monster.tier === 'boss' ? '8%' : '50%' }} />
  ) : (
    <span style={{ width: size, height: size }} className={`inline-block shrink-0 ${className}`} aria-hidden="true" />
  )
}
