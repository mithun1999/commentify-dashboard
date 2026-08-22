import { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ProfileQueryEnum } from '@/features/users/query/profile.query'
import {
  createOnboardingCommentSetting,
  createOnboardingTwitterPostSetting,
  validateOnboardingKeywords,
} from '../api/onboarding.api'
import {
  IOnboardingCommentPayload,
  IOnboardingTwitterPostPayload,
} from '../interface/onboarding.interface'

const messageOf = (error: AxiosError<{ message?: string }>, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback

export const useValidateOnboardingKeywords = () => {
  const { mutateAsync, isPending } = useMutation<
    { valid: string[]; invalid: string[] },
    AxiosError<{ message?: string }>,
    { keywords: string[]; profileId?: string }
  >({
    mutationFn: validateOnboardingKeywords,
  })

  return {
    validateOnboardingKeywordsAsync: mutateAsync,
    isValidatingKeywords: isPending,
  }
}

/**
 * X only. LinkedIn derives targeting from the connected profile instead of
 * asking for it, so this is reached from the X targeting step alone.
 */
export const useCreateOnboardingTwitterPostQuery = () => {
  const queryClient = useQueryClient()
  const { mutateAsync, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    IOnboardingTwitterPostPayload
  >({
    mutationFn: createOnboardingTwitterPostSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error) => {
      toast.error(
        messageOf(error, 'Something went wrong while saving your targeting')
      )
    },
  })

  return {
    createOnboardingTwitterPostSettingAsync: mutateAsync,
    isCreatingOnboardingTwitterPost: isPending,
  }
}

export const useCreateOnboardingCommentQuery = () => {
  const queryClient = useQueryClient()
  const { mutateAsync, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    IOnboardingCommentPayload
  >({
    mutationFn: createOnboardingCommentSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error) => {
      toast.error(
        messageOf(error, 'Something went wrong while saving your reply style')
      )
    },
  })

  return {
    createOnboardingCommentSettingAsync: mutateAsync,
    isCreatingOnboardingComment: isPending,
  }
}
