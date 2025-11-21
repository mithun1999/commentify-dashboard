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
