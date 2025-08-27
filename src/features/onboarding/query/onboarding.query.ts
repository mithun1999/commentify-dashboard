import { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { showSubmittedData } from '@/utils/show-submitted-data'
import { updateOnboardingStatus } from '@/features/auth/api/user.api'
import { ProfileQueryEnum } from '@/features/users/query/profile.query'
import {
  createOnboardingCommentSetting,
  createOnboardingPostSetting,
} from '../api/onboarding.api'
import {
  IOnboardingCommentPayload,
  IOnboardingPostPayload,
} from '../interface/onboarding.interface'

export const useCreateOnboardingPostQuery = () => {
  const queryClient = useQueryClient()
  const { mutate, mutateAsync, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    IOnboardingPostPayload
  >({
    mutationFn: createOnboardingPostSetting,
    onSuccess: () => {
      showSubmittedData('Post settings saved successfully')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
      updateOnboardingStatus({
        status: 'in-progress',
        step: 3,
      })
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while saving post settings'
      )
    },
  })

  return {
    createOnboardingPostSetting: mutate,
    // expose async version so callers can await success/failure
    createOnboardingPostSettingAsync: mutateAsync,
    isCreatingOnboardingPost: isPending,
  }
}

export const useCreateOnboardingCommentQuery = () => {
  const queryClient = useQueryClient()
  const { mutate, mutateAsync, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    IOnboardingCommentPayload
  >({
    mutationFn: createOnboardingCommentSetting,
    onSuccess: () => {
      showSubmittedData('Comment settings saved successfully')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
      updateOnboardingStatus({
        status: 'completed',
        step: 4,
      })
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while saving comment settings'
      )
    },
  })

  return {
    createOnboardingCommentSetting: mutate,
    createOnboardingCommentSettingAsync: mutateAsync,
    isCreatingOnboardingComment: isPending,
  }
}
