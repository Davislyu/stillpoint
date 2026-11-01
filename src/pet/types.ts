export const SPECIES = ['fox', 'cat', 'dragon', 'spirit'] as const
export type Species = (typeof SPECIES)[number]
export interface PetPref {
  species: Species
  name: string
  /** Day it was adopted. */
  since: string
}
export const isSpecies = (v: unknown): v is Species => typeof v === 'string' && (SPECIES as readonly string[]).includes(v)
export function normPet(raw: unknown): PetPref | null {
  const r = raw as Partial<PetPref> | null
  if (!r || typeof r !== 'object' || !isSpecies(r.species)) return null
  const name = typeof r.name === 'string' ? r.name.trim().slice(0, 16) : ''
  return { species: r.species, name: name || 'Pip', since: typeof r.since === 'string' ? r.since : '' }
}
