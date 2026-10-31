import type { SpendingCategory } from '../state/types'

/** Change this one line to track spending in another currency. */
export const CURRENCY = 'USD'

const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY })
export const formatCents = (cents: number) => fmt.format(cents / 100)
export const currencySymbol =
  fmt.formatToParts(0).find((p) => p.type === 'currency')?.value ?? '$'

/** "4.5", "4,50", "$12" → cents. Returns null for anything that isn't a positive amount. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d.,]/g, '').replace(',', '.')
  if (!/^\d{0,6}(\.\d{0,2})?$/.test(cleaned) || cleaned === '' || cleaned === '.') return null
  const cents = Math.round(Number(cleaned) * 100)
  return cents > 0 ? cents : null
}

export const CATEGORIES: { id: SpendingCategory; label: string }[] = [
  { id: 'coffee', label: 'Coffee' },
  { id: 'eating-out', label: 'Eating out' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'impulse', label: 'Impulse buy' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'other', label: 'Other' },
]
export const categoryLabel = (id: SpendingCategory) => CATEGORIES.find((c) => c.id === id)?.label ?? 'Other'

/**
 * This ledger is for leaks only. Descriptions that clearly name an essential
 * cost are turned away with a note, so the monthly total stays meaningful.
 */
const ESSENTIAL = /\b(grocer(y|ies)|supermarket|rent|mortgage|electric(ity)?|water bill|gas bill|utilit(y|ies)|insurance|tuition|medical|pharmacy|prescription|tax(es)?)\b/i
export const looksEssential = (description: string) => ESSENTIAL.test(description)
