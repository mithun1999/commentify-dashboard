import { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { showSubmittedData } from '@/utils/show-submitted-data'
import { ProfileQueryEnum } from '@/features/users/query/profile.query'
import {
  ICommentSettingPayload,
  IRevertTargetingChangeResult,
  IScrapeSettingPayload,
  ITargetingChange,
} from '../interface/setting.interface'
import {
  createCommentSetting,
  createOrUpdateTwitterCommentSetting,
  createOrUpdateTwitterScrapeSetting,
  createScrapeSetting,
  getTargetingChanges,
  revertTargetingChange,
  updateCommentSetting,
  updateMonitoredProfiles,
  updateScrapeSetting,
} from '../types/setting.api'

export enum SettingQueryEnum {
  GET_TARGETING_CHANGES = 'get-targeting-changes',
}

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

export const useUpdateMonitoredProfilesQuery = () => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation<
    unknown,
    AxiosError<{ message?: string }>,
    { profileId: string; monitoredProfiles: string[] }
  >({
    mutationFn: updateMonitoredProfiles,
    onSuccess: () => {
      showSubmittedData('Monitored profiles saved successfully')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while saving monitored profiles'
      )
    },
  })

  return {
    updateMonitoredProfiles: mutate,
    isUpdatingMonitoredProfiles: isPending,
  }
}

export const useTwitterScrapeSettingQuery = () => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: createOrUpdateTwitterScrapeSetting,
    onSuccess: () => {
      showSubmittedData('Scrape settings saved successfully')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while saving scrape settings'
      )
    },
  })

  return { saveTwitterScrapeSetting: mutate, isSavingTwitterScrapeSetting: isPending }
}

export const useTwitterCommentSettingQuery = () => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: createOrUpdateTwitterCommentSetting,
    onSuccess: () => {
      showSubmittedData('Comment settings saved successfully')
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while saving comment settings'
      )
    },
  })

  return { saveTwitterCommentSetting: mutate, isSavingTwitterCommentSetting: isPending }
}

/**
 * What Commentify changed on this profile's behalf.
 *
 * Errors are swallowed rather than toasted. The endpoint 404s for a profile
 * with no setting document yet, which is an ordinary state for a new signup,
 * and an error toast on opening the settings page would be alarming and wrong.
 * An empty history and an unreachable history both render nothing.
 */
export const useTargetingChangesQuery = (profileId?: string) => {
  const { data, isLoading } = useQuery<ITargetingChange[]>({
    queryKey: [SettingQueryEnum.GET_TARGETING_CHANGES, profileId],
    queryFn: () => getTargetingChanges(profileId as string),
    enabled: Boolean(profileId),
    retry: false,
  })

  return { targetingChanges: data ?? [], isLoadingTargetingChanges: isLoading }
}

export const useRevertTargetingChangeQuery = () => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation<
    IRevertTargetingChangeResult,
    AxiosError<{ message?: string }>,
    { profileId: string; changeId: string }
  >({
    mutationFn: revertTargetingChange,
    onSuccess: (result) => {
      // A partial undo has to say so. Fields the customer edited after the
      // change are left as they set them, and reporting "restored" for those
      // would tell them their settings went back when they did not.
      if (result?.skipped?.length) {
        toast.warning(
          `Restored your earlier settings, except ${result.skipped.length} ` +
            `field(s) you have changed since — those were left as you set them.`
        )
      } else {
        showSubmittedData('Your earlier targeting settings are back')
      }
      queryClient.invalidateQueries({
        queryKey: [SettingQueryEnum.GET_TARGETING_CHANGES],
        refetchType: 'active',
      })
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        refetchType: 'active',
      })
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while undoing that change'
      )
    },
  })

  return {
    revertTargetingChange: mutate,
    isRevertingTargetingChange: isPending,
  }
}
