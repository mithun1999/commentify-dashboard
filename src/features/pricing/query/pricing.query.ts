'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { QueryService } from '@/services/query.service'
import { toast } from 'sonner'
import { CreditsQueryEnum } from '@/features/credits/query/credits.query'
import {
  checkIsLifetimeActivated,
  createTransaction,
  getPlans,
} from '../api/pricing.api'

export enum TransactionQueryEnum {
  GET_TRANSACTION_BY_ID = 'get-transaction-by-id',
  GET_CHECK_IS_LIFETIME = 'check-is-lifetime',
}

export enum PlanQueryEnum {
  GET_PLANS = 'get-plans',
}

export const useCreateTransactionQuery = () => {
  const router = useRouter()
  const queryClient = QueryService.getQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CreditsQueryEnum.GET_CREDITS],
      })
      router.navigate({ to: '/' })
    },
    onError: (error: unknown) => {
      // eslint-disable-next-line no-console
      console.log(error)
      toast.error('Something went wrong while transacting')
    },
  })

  return { createTransaction: mutate, isCreatingTransaction: isPending }
}

export const useGetCheckLifetimeQuery = () => {
  const { data, isLoading } = useQuery({
    queryKey: [TransactionQueryEnum.GET_CHECK_IS_LIFETIME],
    queryFn: () => checkIsLifetimeActivated(),
    retry: 3,
    refetchOnWindowFocus: false,
  })

  return { data, isLoading }
}

export const useGetPlans = () => {
  const { data, isLoading } = useQuery({
    queryKey: [PlanQueryEnum.GET_PLANS],
    queryFn: () => getPlans(),
    retry: 2,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 60,
  })

  return { data, isLoading }
}
