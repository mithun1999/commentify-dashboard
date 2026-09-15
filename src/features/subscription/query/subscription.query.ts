'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { IUser } from '@/features/auth/interface/user.interface'
import { UserQueryEnum } from '@/features/auth/query/user.query'
import {
  cancelSubscription,
  createCheckoutUrl,
  createTopupCheckoutUrl,
  getCustomerPortalUrl,
  getPaymentRecovery,
  getPostCredits,
  upgradeDowngradeSubscription,
} from '../api/subscription.api'

export enum SubscriptionQueryEnum {
  GET_CUSTOMER_PORTAL_URL = 'get-customer-portal-url',
  GET_POST_CREDITS = 'get-post-credits',
  GET_PAYMENT_RECOVERY = 'get-payment-recovery',
}

/**
 * Whether the user's subscription is blocked on a failed payment, plus the link
 * that clears it.
 *
 * Refetches on focus so the banner clears on its own once the user pays in the
 * other tab and the provider webhook lands. The link itself is cached
 * server-side, so refetching never creates an extra charge.
 */
export const useGetPaymentRecoveryQuery = ({ user }: { user?: IUser }) => {
  const { data, isLoading } = useQuery({
    queryKey: [SubscriptionQueryEnum.GET_PAYMENT_RECOVERY, user?._id],
    queryFn: () => getPaymentRecovery(),
    enabled: Boolean(user?.subscription),
    retry: 1,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 30,
  })

  return { data, isLoading }
}

export const useUpdateSubscriptionPlan = () => {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: upgradeDowngradeSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [UserQueryEnum.GET_USER],
      })

      toast.success(
        'Subscription plan updated! Changes will be reflected shortly.'
      )
      router.navigate({ to: '/billing' })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error.message ||
          'Something went wrong while updating subscription plan. Please contact support.'
      )
    },
  })

  return {
    updateSubscriptionPlan: mutate,
    isUpdatingSubscriptionPlan: isPending,
  }
}

export const useCancelSubscription = ({
  cb,
}: {
  cb?: (data: { success: boolean; endsAt: string | null }) => void
} = {}) => {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [UserQueryEnum.GET_USER] })
      cb?.(data)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error.message ||
          'Something went wrong while cancelling. Please contact support.'
      )
    },
  })

  return {
    cancelSubscription: mutate,
    isCancellingSubscription: isPending,
  }
}

export const useCreateCheckoutUrl = ({ cb }: { cb: (url: string) => void }) => {
  const { mutate, isPending } = useMutation({
    mutationFn: createCheckoutUrl,
    onSuccess: (data) => {
      if (data?.url) cb(data.url)
      else toast.error("Couldn't get the checkout url")
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error.message ||
          'Something went wrong while checking out. Please contact support'
      )
    },
  })

  return {
    createCheckoutUrl: mutate,
    isCreatingCheckoutUrl: isPending,
  }
}

export const useGetPostCreditsQuery = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { data, isLoading } = useQuery({
    queryKey: [SubscriptionQueryEnum.GET_POST_CREDITS],
    queryFn: () => getPostCredits(),
    enabled,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60,
  })

  return { data, isLoading }
}

export const useCreateTopupCheckoutUrl = ({
  cb,
}: {
  cb: (url: string) => void
}) => {
  const { mutate, isPending, variables } = useMutation({
    mutationFn: createTopupCheckoutUrl,
    onSuccess: (data) => {
      if (data?.url) cb(data.url)
      else toast.error("Couldn't start the top-up checkout")
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error.message ||
          'Something went wrong starting checkout. Please contact support'
      )
    },
  })

  return {
    createTopupCheckoutUrl: mutate,
    isCreatingTopupCheckoutUrl: isPending,
    pendingProductId: variables?.productId,
  }
}

export const useGetCustomerPortalUrlQuery = ({ user }: { user: IUser }) => {
  const placeholderData = {
    customerPortal: '',
    customerPortalUpdateSubscription: '',
    updatePaymentMethod: '',
  }

  const { data, isLoading, isError, isFetching, status } = useQuery({
    queryKey: [SubscriptionQueryEnum.GET_CUSTOMER_PORTAL_URL, user?._id],
    queryFn: () => getCustomerPortalUrl(),
    enabled: Boolean(user?.subscription),
    placeholderData,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 60 * 24,
  })

  // Show error toast when portal data is unavailable (query failed or returned placeholder)
  const hasToastedRef = useRef(false)
  useEffect(() => {
    if (
      user?.subscription &&
      isError &&
      !isFetching &&
      !hasToastedRef.current
    ) {
      hasToastedRef.current = true
      toast.error('Unable to fetch billing portal details', {
        id: 'portal-error',
      })
    }
  }, [user?.subscription, isError, isFetching])

  if (
    user?.subscription &&
    status === 'success' &&
    !isFetching &&
    !data?.customerPortal &&
    !hasToastedRef.current
  ) {
    hasToastedRef.current = true
    toast.error('Unable to fetch billing portal details', {
      id: 'portal-error',
    })
  }

  return { data, isLoading }
}
