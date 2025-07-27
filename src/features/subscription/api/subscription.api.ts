import { axiosInstance } from '@/utils/axios.util'
import { ILsSubscription } from '../interfaces/subscription.interface'

export async function upgradeDowngradeSubscription(payload: {
  productId: string
  variantId: string
}) {
  const { data } = await axiosInstance({
    method: 'PATCH',
    url: `/subscription`,
    data: payload,
  })
  return data as ILsSubscription
}

export async function createCheckoutUrl(payload: {
  variantId: string
  embed?: boolean
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
