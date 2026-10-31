import type { AccentId } from '../state/types'

/**
 * Low-saturation category accents. Actual colours live in CSS variables
 * (index.css) so each one can be tuned separately for light and dark.
 */
export const ACCENTS: { id: AccentId; label: string }[] = [
  { id: 'sage', label: 'Sage' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'mauve', label: 'Mauve' },
  { id: 'sand', label: 'Sand' },
  { id: 'teal', label: 'Teal' },
  { id: 'clay', label: 'Clay' },
]

export const accentVar = (id: AccentId) => `var(--accent-${id})`
export const accentSoftVar = (id: AccentId) => `var(--accent-${id}-soft)`
