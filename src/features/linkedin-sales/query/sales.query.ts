import { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AgentMode } from '@/features/settings/interface/setting.interface'
import { ProfileQueryEnum } from '@/features/users/query/profile.query'
import {
  createOrUpdateSalesSetting,
  extractFromWebsite,
  switchAgentMode,
} from '../api/sales.api'
import type {
  ICreateSalesSettingPayload,
  ISalesSettingPayload,
  IWebsiteExtractionResult,
} from '../interface/sales.interface'

export const useCreateSalesSetting = () => {
  const queryClient = useQueryClient()
  const { mutate, mutateAsync, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    ICreateSalesSettingPayload
  >({
    mutationFn: createOrUpdateSalesSetting,
    onSuccess: () => {
      toast.success('Sales settings saved successfully')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while saving sales settings'
      )
    },
  })

  return {
    createSalesSetting: mutate,
    createSalesSettingAsync: mutateAsync,
    isCreatingSalesSetting: isPending,
  }
}

export const useExtractFromWebsite = () => {
  const { mutate, mutateAsync, isPending, data } = useMutation<
    IWebsiteExtractionResult,
    AxiosError<{ message?: string }>,
    string
  >({
    mutationFn: extractFromWebsite,
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to extract data from website. Please fill in the details manually.'
      )
    },
  })

  return {
    extract: mutate,
    extractAsync: mutateAsync,
    isExtracting: isPending,
    extractedData: data,
  }
}

export const useSwitchAgentMode = () => {
  const queryClient = useQueryClient()
  const { mutateAsync, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    {
      profileId: string
      mode: AgentMode
      existingSalesData?: ISalesSettingPayload
    }
  >({
    mutationFn: ({ profileId, mode, existingSalesData }) =>
      switchAgentMode(profileId, mode, existingSalesData),
    onSuccess: (_data, variables) => {
      const label =
        variables.mode === 'sales' ? 'Sales' : 'Personal Branding'
      toast.success(`Switched to ${label} mode`)
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to switch agent mode'
      )
    },
  })

  return {
    switchModeAsync: mutateAsync,
    isSwitchingMode: isPending,
  }
}
