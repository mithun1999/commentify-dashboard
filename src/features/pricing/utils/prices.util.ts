import type { IProduct } from '../interfaces/price.interface'

const NEW_CATALOG_PLAN_SKU = /^(comment|post)_(starter|pro)_(monthly|yearly)$/

/**
 * A subscription is "legacy" when its base product predates the two-agent catalog.
 * New base plans always carry a `comment_*`/`post_*` SKU; legacy docs (e.g.
 * `pro_monthly`, `premium_yearly`) do not. SKU is the primary signal so this stays
 * correct even if legacy docs are later backfilled with `agentType`/`tier`/`kind`.
 */
export const isLegacyProduct = (product?: IProduct | null): boolean => {
  if (!product) return false
  const sku = product.sku?.trim()
  if (sku) return !NEW_CATALOG_PLAN_SKU.test(sku)
  return true
}

/**
 * Get currency symbol from currency code
 * @param currencyCode - ISO 4217 currency code (e.g., 'USD', 'EUR')
 * @returns Currency symbol (e.g., '$', '€')
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  const currencyMap: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    INR: '₹',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'CHF',
    CNY: '¥',
    SEK: 'kr',
    NZD: 'NZ$',
  }
  return currencyMap[currencyCode.toUpperCase()] || currencyCode
}
