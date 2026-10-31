import { todayKey } from '../lib/date'
import type { AppState } from './types'

/** Downloads everything currently loaded for this account as JSON. */
export function exportState(state: AppState): void {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stillpoint-export-${todayKey()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── v1 (local-only) data ────────────────────────────────────────────────

export const LEGACY_KEY = 'stillpoint:v1'
export const legacyImportedKey = (userId: string) => `stillpoint:v1-imported:${userId}`

export interface LegacyState {
  version: 1
  habits: { id: string; name: string; accent: string; createdOn: string; archivedOn?: string }[]
  completions: Record<string, string[]>
  milestones?: Record<string, string>
}

/** Validates something that claims to be v1 data (from this browser or a backup file). */
export function parseLegacy(raw: unknown): LegacyState | null {
  const r = raw as LegacyState | null
  if (r?.version !== 1 || !Array.isArray(r.habits) || typeof r.completions !== 'object' || !r.completions) return null
  const ok = r.habits.every(
    (h) => typeof h.id === 'string' && typeof h.name === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h.createdOn ?? ''),
  )
  return ok ? r : null
}

/** v1 data left in this browser (same address), if it has habit history worth importing. */
export function readLegacy(userId: string): LegacyState | null {
  try {
    if (localStorage.getItem(legacyImportedKey(userId))) return null
    const data = parseLegacy(JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null'))
    const hasHistory = data && Object.values(data.completions).some((ids) => ids.length > 0)
    return hasHistory ? data : null
  } catch {
    return null
  }
}
