import { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { showSubmittedData } from '@/utils/show-submitted-data'
import { ProfileQueryEnum } from '@/features/users/query/profile.query'
import {
  ICommentSettingPayload,
  IScrapeSettingPayload,
} from '../interface/setting.interface'
import {
  createCommentSetting,
  createScrapeSetting,
  updateCommentSetting,
  updateScrapeSetting,
} from '../types/setting.api'

type UserPlan = 'starter' | 'pro' | 'premium'

type CommonSettingPayload = {
  userPlan?: UserPlan
  profileId: string
}

type ScrapeSettingPayload = IScrapeSettingPayload & CommonSettingPayload

type CommentSettingPayload = ICommentSettingPayload & CommonSettingPayload

export const useCreateScrapeSettingQuery = () => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    ScrapeSettingPayload
  >({
    mutationFn: createScrapeSetting,
    onSuccess: () => {
      showSubmittedData('Post settings saved successfully')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while creating settings'
      )
    },
  })

  return {
    createScrapeSetting: mutate,
    isCreatingScrapeSetting: isPending,
  }
}

export const useUpdateScrapeSettingQuery = () => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    ScrapeSettingPayload
  >({
    mutationFn: updateScrapeSetting,
    onSuccess: () => {
      showSubmittedData('Post settings saved successfully')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while updating settings'
      )
    },
  })

  return {
    updateScrapeSetting: mutate,
    isUpdatingScrapeSetting: isPending,
  }
}

export const useCreateCommentSettingQuery = () => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    CommentSettingPayload
  >({
    mutationFn: createCommentSetting,
    onSuccess: () => {
      showSubmittedData('Comment settings saved successfully')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while creating settings'
      )
    },
  })

  return {
    createCommentSetting: mutate,
    isCreatingCommentSetting: isPending,
  }
}

export const useUpdateCommentSettingQuery = () => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    CommentSettingPayload
  >({
    mutationFn: updateCommentSetting,
    onSuccess: () => {
      showSubmittedData('Comment settings saved successfully')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while creating settings'
      )
    },
  })

  return {
    updateCommentSetting: mutate,
    isUpdatingCommentSetting: isPending,
  }
}
