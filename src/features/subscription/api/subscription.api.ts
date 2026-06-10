import { axiosInstance } from '@/utils/axios.util'
import {
  ILsSubscription,
  PaymentProvider,
} from '../interfaces/subscription.interface'

export interface ICartAddon {
  productId: string
  quantity?: number
}

export async function upgradeDowngradeSubscription(payload: {
  productId: string
  provider?: 'lemon_squeezy' | 'dodo_payments'
  quantity?: number
  addons?: ICartAddon[]
}) {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/subscription`,
    data: payload,
  })
  return data as ILsSubscription
}

export async function createCheckoutUrl(payload: {
  productId: string
  provider: PaymentProvider
  embed?: boolean
  quantity?: number
  email?: string
  name?: string
  addons?: ICartAddon[]
  discountCode?: string
}) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/subscription/checkout`,
    data: payload,
  })
  return data as { url: string; expiryAt: string }
}

export interface IPostCreditSummary {
  tier: 'starter' | 'pro'
  monthlyAllowance: number
  monthlyUsed: number
  monthlyRemaining: number
  lifetimeCredits: number
  totalAvailable: number
  enforced: boolean
}

export async function getPostCredits() {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/credits/post`,
  })
  return data as IPostCreditSummary
}

export async function createTopupCheckoutUrl(payload: {
  productId: string
  provider?: PaymentProvider
}) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/subscription/topup/checkout`,
    data: payload,
  })
  return data as { url: string; sessionId?: string }
}

export async function verifyCheckout(subscriptionId: string) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/subscription/verify/${subscriptionId}`,
  })
  return data as { success: boolean }
}

export async function getCustomerPortalUrl() {
  const { data } = await axiosInstance({
    method: 'GET',
    url: `/subscription/portal`,
  })
  return data as {
    updatePaymentMethod: string
    customerPortal: string
    customerPortalUpdateSubscription: string
  }
}

export async function cancelSubscription(payload: {
  reason?: string
  comment?: string
}) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/subscription/cancel`,
    data: payload,
  })
  return data as { success: boolean; endsAt: string | null }
}
