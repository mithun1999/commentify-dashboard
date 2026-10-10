import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { IUser } from '@/features/auth/interface/user.interface'
import { UserQueryEnum } from '@/features/auth/query/user.query'
import { verifyCheckout } from '@/features/subscription/api/subscription.api'
import { SubscriptionStatusEnum } from '@/features/subscription/enum/subscription.enum'
import { SubscriptionQueryEnum } from '@/features/subscription/query/subscription.query'
import { ProfileQueryEnum } from '@/features/users/query/profile.query'

export type CheckoutReturnState =
  | 'none'
  | 'confirming'
  | 'pending'
  | 'active'
  | 'failed'

const PENDING_POLL_INTERVAL_MS = 5000
// Card mandates usually clear in under a minute; some Indian banks take ~10.
const PENDING_POLL_TIMEOUT_MS = 10 * 60 * 1000

/**
 * What to tell someone who lands on Billing, usually straight back from Dodo.
 *
 * Dodo redirects with status=active as soon as checkout completes, even when
 * the bank is still confirming the card and the subscription is pending. So the
 * URL can't be trusted: verify asks Dodo directly and records the subscription
 * (pending rows grant nothing), then the user's own subscription is the source
 * of truth. While it's pending we poll until the webhook flips it.
 */
export function useCheckoutReturn(user?: IUser) {
  const queryClient = useQueryClient()
  const [params] = useState(() => new URLSearchParams(window.location.search))
  // Top-up packs return here too, with payment_id and no subscription_id;
  // those aren't subscription checkouts and get no banner from this hook.
  const subscriptionId = params.get('subscription_id')
  const returnStatus = subscriptionId ? params.get('status') : null
  const returnedFailed =
    returnStatus === 'failed' || returnStatus === 'cancelled'

  const [verifying, setVerifying] = useState(
    Boolean(subscriptionId) && !returnedFailed
  )
  const [verifyFailed, setVerifyFailed] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const verifyCalledRef = useRef(false)

  const refreshBilling = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [UserQueryEnum.GET_USER] }),
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
      }),
      queryClient.invalidateQueries({
        queryKey: [SubscriptionQueryEnum.GET_CUSTOMER_PORTAL_URL],
      }),
      queryClient.invalidateQueries({
        queryKey: [SubscriptionQueryEnum.GET_PAYMENT_RECOVERY],
      }),
    ])

  useEffect(() => {
    if (!verifying || !subscriptionId || verifyCalledRef.current) return
    verifyCalledRef.current = true
    verifyCheckout(subscriptionId)
      .then((res) => setVerifyFailed(res.status === 'failed'))
      // The webhook still lands on its own; fall back to the user's status.
      .catch(() => undefined)
      .finally(async () => {
        await refreshBilling()
        setVerifying(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifying, subscriptionId])

  const subscription = user?.subscription
  const isPending = subscription?.status === SubscriptionStatusEnum.PENDING
  const isThisSubscription =
    Boolean(subscriptionId) && subscription?.providerId === subscriptionId

  let state: CheckoutReturnState = 'none'
  if (verifying) state = 'confirming'
  else if (verifyFailed || returnedFailed) state = 'failed'
  else if (isPending) state = 'pending'
  else if (isThisSubscription) state = 'active'
  // verify couldn't record it, so fall back to what Dodo said on the way back
  // until the webhook writes this subscription.
  else if (returnStatus === 'pending') state = 'pending'
  else if (subscriptionId) state = 'active'

  const wasPendingRef = useRef(false)
  useEffect(() => {
    if (state !== 'pending') {
      // Bank confirmed: the portal and agents were fetched against the old
      // subscription, so pull them again.
      if (wasPendingRef.current) void refreshBilling()
      wasPendingRef.current = false
      return
    }
    wasPendingRef.current = true
    const startedAt = Date.now()
    const timer = setInterval(() => {
      if (Date.now() - startedAt > PENDING_POLL_TIMEOUT_MS) {
        setTimedOut(true)
        clearInterval(timer)
        return
      }
      void queryClient.invalidateQueries({ queryKey: [UserQueryEnum.GET_USER] })
    }, PENDING_POLL_INTERVAL_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return { state, timedOut }
}
