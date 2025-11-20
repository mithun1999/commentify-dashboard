import { axiosInstance } from '@/utils/axios.util'
import { ILsSubscription } from '../interfaces/subscription.interface'

export async function upgradeDowngradeSubscription(payload: {
  productId: string
  provider?: 'lemon_squeezy' | 'dodo_payments'
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
  provider: 'lemon_squeezy' | 'dodo_payments'
  embed?: boolean
  quantity?: number
  email?: string
  name?: string
}) {
  const { data } = await axiosInstance({
    method: 'POST',
    url: `/subscription/checkout`,
    data: payload,
  })
  return data as { url: string; expiryAt: string }
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
