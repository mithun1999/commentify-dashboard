import { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { showSubmittedData } from '@/utils/show-submitted-data'
import { ProfileQueryEnum } from '@/features/users/query/profile.query'
import {
  analyzeOnboardingProfile,
  createOnboardingCommentSetting,
  createOnboardingPostSetting,
  createOnboardingTwitterPostSetting,
  refineOnboardingKeywords,
  validateOnboardingKeywords,
  type IAnalyzeProfileResult,
} from '../api/onboarding.api'
import {
  IOnboardingCommentPayload,
  IOnboardingPostPayload,
  IOnboardingTwitterPostPayload,
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

export const useAnalyzeOnboardingProfile = () => {
  const { mutateAsync, isPending } = useMutation<
    IAnalyzeProfileResult,
    AxiosError<{ message?: string }>,
    { profileId: string; mode: 'branding' | 'sales' }
  >({
    mutationFn: analyzeOnboardingProfile,
  })

  return {
    analyzeOnboardingProfileAsync: mutateAsync,
    isAnalyzingProfile: isPending,
  }
}

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

export const useRefineOnboardingKeywords = () => {
  const { mutateAsync, isPending } = useMutation<
    { keywords: string[]; invalid: string[] },
    AxiosError<{ message?: string }>,
    { profileId: string; existing: string[]; mode: 'branding' | 'sales' }
  >({
    mutationFn: refineOnboardingKeywords,
  })

  return {
    refineOnboardingKeywordsAsync: mutateAsync,
    isRefiningKeywords: isPending,
  }
}

export const useCreateOnboardingTwitterPostQuery = () => {
  const queryClient = useQueryClient()
  const { mutateAsync, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    IOnboardingTwitterPostPayload
  >({
    mutationFn: createOnboardingTwitterPostSetting,
    onSuccess: () => {
      showSubmittedData('Scrape settings saved successfully')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while saving scrape settings'
      )
    },
  })

  return {
    createOnboardingTwitterPostSettingAsync: mutateAsync,
    isCreatingOnboardingTwitterPost: isPending,
  }
}
