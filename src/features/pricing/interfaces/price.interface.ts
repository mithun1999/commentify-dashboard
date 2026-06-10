export interface IPrice {
  name: string
  price: number | string
  features: string[]
  popular?: boolean
  value: string
  cta?: string
  ctaValue?: string
  credits: number
  intent?: string
}

export interface ITransactionPayload {
  transactionId: string
  status: string
  creditsPurchased: number
  amount: string
  intentData: string
  intent?: string
}

export interface IProviderData {
  provider: string
  providerId: string
  slug: string
  paymentUrl: string
  metadata?: {
    oldProductId?: string
    oldVariantId?: string
    originalProductName?: string
    originalVariantName?: string
  }
}

export type ProductAgentType = 'comment' | 'post'
export type ProductTier = 'starter' | 'pro'
export type ProductKind = 'plan' | 'addon' | 'topup'
// `slot` is the unified add-on family (one agent × tier profile instance).
// `agent`/`platform` remain only for reading legacy (retired) add-on docs.
export type ProductAddonType = 'slot' | 'agent' | 'platform'
export type ProductVariant = 'standard' | 'discounted'

export interface IProduct {
  _id: string
  name: string
  sku?: string
  description?: string
  defaultDisplayPrice: string
  defaultPrice: number
  currency: string
  imageUrl?: string
  providerData: IProviderData[]
  interval: 'monthly' | 'yearly'
  hasFreeTrial: boolean
  status: string
  createdAt: string
  updatedAt: string
  features: string[]
  // Two-agent catalog fields (present on the new catalog; absent on legacy docs).
  agentType?: ProductAgentType
  tier?: ProductTier
  kind?: ProductKind
  addonType?: ProductAddonType
  variant?: ProductVariant
  // Post-generation credits granted by a one-time top-up product.
  creditAmount?: number
  __v?: number
}

export interface IProductVariant {
  name: string
  price: number
  slug: string
  description?: string
  hasFreeTrial?: boolean
  providerId: number
  createdAt: Date
  _id: string
}

export interface IDisplayProductVariant extends IProductVariant {
  displayPrice?: string
}

export interface IDisplayProduct extends IProduct {
  popular?: boolean
  displayPrice?: string
}
