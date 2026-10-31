import type { SpendingCategory } from '../state/types'

import { useThemeCtx, type Currency } from '../themes/vibe'

const formatters = new Map<Currency, Intl.NumberFormat>()
const fmt = (c: Currency) => {
  if (!formatters.has(c)) formatters.set(c, new Intl.NumberFormat(undefined, { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }))
  return formatters.get(c)!
}

/** Amounts are stored as plain numbers; the currency is a display preference. */
export const formatCents = (cents: number, currency: Currency) => fmt(currency).format(cents / 100)
export const symbolFor = (currency: Currency) => fmt(currency).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency

/** The signed-in user's currency, with a formatter bound to it. */
export function useMoney() {
  const { prefs, setCurrency } = useThemeCtx()
  const currency = prefs.currency
  return { currency, setCurrency, symbol: symbolFor(currency), format: (cents: number) => formatCents(cents, currency) }
}

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
const ESSENTIAL = /\b(grocer(y|ies)|supermarket|rent|mortgage|electric(ity)?|water bill|gas bill|utilit(y|ies)|insurance|tuition|medical|pharmacy|prescription|tax(es)?|arnona|va'ad bayit|vaad bayit|shufersal|rami levy)\b/i
export const looksEssential = (description: string) => ESSENTIAL.test(description)
