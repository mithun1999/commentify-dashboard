'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { QueryService } from '@/services/query.service'
import { toast } from 'sonner'
import type { IUser } from '@/features/auth/interface/user.interface'
import { UserQueryEnum } from '@/features/auth/query/user.query'
import {
  createCheckoutUrl,
  getCustomerPortalUrl,
  upgradeDowngradeSubscription,
} from '../api/subscription.api'

export enum SubscriptionQueryEnum {
  GET_CUSTOMER_PORTAL_URL = 'get-customer-portal-url',
}

export const useUpdateSubscriptionPlan = () => {
  const router = useRouter()
  const queryClient = QueryService.getQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: upgradeDowngradeSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [UserQueryEnum.GET_USER] })
      router.navigate({ to: '/pricing' })
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

export const useGetCustomerPortalUrlQuery = ({ user }: { user: IUser }) => {
  const placeholderData = {
    customerPortal: '',
    customerPortalUpdateSubscription: '',
    updatePaymentMethod: '',
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: [SubscriptionQueryEnum.GET_CUSTOMER_PORTAL_URL],
    queryFn: () =>
      user?.subscription ? getCustomerPortalUrl() : placeholderData,
    placeholderData,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 60 * 24,
  })

  // Show error toast when portal data is unavailable (query failed or returned placeholder)
  const hasToastedRef = useRef(false)
  useEffect(() => {
    if (isError && !hasToastedRef.current) {
      hasToastedRef.current = true
      toast.error('Unable to fetch billing portal details', {
        id: 'portal-error',
      })
    }
  }, [isError])

  if (
    !isLoading &&
    !data?.customerPortal &&
    user?.subscription &&
    !hasToastedRef.current
  ) {
    hasToastedRef.current = true
    toast.error('Unable to fetch billing portal details', {
      id: 'portal-error',
    })
  }

  return { data, isLoading }
}
