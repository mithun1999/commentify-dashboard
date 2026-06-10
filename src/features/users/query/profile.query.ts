import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { envConfig } from '@/config/env.config'
import { useFeatureFlagEnabled } from 'posthog-js/react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { detectExtension } from '@/lib/extension'
import { getProfileDetailsFromExtension } from '@/utils/utils'
import {
  deactivateProfile,
  deleteProfile,
  getAllProfile,
  getLinkedInStats,
  getPostStats,
  getPostingStats,
  linkProfile,
  linkTwitterProfile,
  reactivateProfile,
} from '../api/profile.api'
import {
  ILinkedInStats,
  IProfile,
  IProfileResponseFromExtension,
} from '../interface/profile.interface'
import type { ITwitterProfileFromExtension } from '@/features/twitter-commenting/utils/extension'

export enum ProfileQueryEnum {
  GET_ALL_PROFILE = 'get-all-profile',
  GET_LINKEDIN_STATS = 'get-linkedin-stats',
}

export const useGetAllProfileQuery = () => {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)
  const isSessionLoaded = useAuthStore((state) => state.isSessionLoaded)
  const isSignedIn = useAuthStore((state) => Boolean(state.session?.user?.id))

  const { data, isLoading, isFetched } = useQuery<IProfile[]>({
    queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
    queryFn: getAllProfile,
    enabled: Boolean(isSessionLoaded && isSignedIn),
  })

  useEffect(() => {
    if (!activeProfile && Array.isArray(data) && data.length > 0) {
      setActiveProfile(data[data.length - 1])
    }
  }, [activeProfile, data, setActiveProfile])

  return { data, isLoading, isFetched }
}

export const useDeleteProfile = ({ onSuccess }: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          ProfileQueryEnum.GET_ALL_PROFILE,
          ProfileQueryEnum.GET_LINKEDIN_STATS,
        ],
      })
      onSuccess?.()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while deleting profile'
      )
    },
  })

  return { deleteProfile: mutate, isDeletingProfile: isPending }
}

export const useDeactivateProfile = ({
  onSuccess,
}: { onSuccess?: () => void } = {}) => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: deactivateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
      })
      toast.success('Profile deactivated. The agent is paused.')
      onSuccess?.()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while deactivating the profile'
      )
    },
  })
  return { deactivateProfile: mutate, isDeactivatingProfile: isPending }
}

export const useReactivateProfile = ({
  onSuccess,
}: { onSuccess?: () => void } = {}) => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: reactivateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
      })
      toast.success('Profile reactivated. The agent is running again.')
      onSuccess?.()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while reactivating the profile'
      )
    },
  })
  return { reactivateProfile: mutate, isReactivatingProfile: isPending }
}

export const useLinkProfile = (isOnboardingStep: boolean = false) => {
  const chromeExtensionAvailable = useFeatureFlagEnabled('chrome-extension-available')
  const queryClient = useQueryClient()
  const { setActiveProfile } = useProfileStore()

  const { mutateAsync, isPending } = useMutation({
    mutationFn: linkProfile,
    onSuccess: (response) => {
      if (response?.profile) {
        setActiveProfile(response.profile)
        if (!isOnboardingStep) {
          queryClient.invalidateQueries({
            queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
          })
        }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while linking profile'
      )
    },
  })

  const linkProfileWithValidation = async (
    profileData?: IProfileResponseFromExtension
  ) => {
    if (profileData) {
      if (!profileData.publicIdentifier) {
        toast.error('Please log in to LinkedIn first to continue')
        window.open('https://www.linkedin.com', '_blank')
        return
      }
      return mutateAsync(profileData)
    }

    const { installed: isExtensionInstalled } = await detectExtension()

    if (!isExtensionInstalled) {
      toast.error('Commentify extension is not installed', {
        description: chromeExtensionAvailable
          ? 'Please install the extension from the Chrome Web Store.'
          : 'Please install the Chrome extension to continue.',
      })
      window.open(
        chromeExtensionAvailable ? envConfig.chromeWebStoreUrl : envConfig.extensionUrl,
        '_blank'
      )
      return
    }

    const profileDetails = await getProfileDetailsFromExtension()

    if (!profileDetails.publicIdentifier) {
      toast.error('Please log in to LinkedIn first to continue')
      window.open('https://www.linkedin.com', '_blank')
      return
    }

    return mutateAsync(profileDetails)
  }

  return { linkProfile: linkProfileWithValidation, isLinkingProfile: isPending }
}

export const useLinkTwitterProfile = (isOnboardingStep: boolean = false) => {
  const queryClient = useQueryClient()
  const { setActiveProfile } = useProfileStore()

  const { mutateAsync, isPending } = useMutation({
    mutationFn: linkTwitterProfile,
    onSuccess: (response) => {
      if (response?.profile) {
        setActiveProfile(response.profile)
        if (!isOnboardingStep) {
          queryClient.invalidateQueries({
            queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
          })
        }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while linking X profile'
      )
    },
  })

  const linkTwitterProfileWithValidation = async (
    profileData: ITwitterProfileFromExtension
  ) => {
    if (!profileData.screenName) {
      toast.error('Please log in to X.com first to continue')
      window.open('https://x.com', '_blank')
      return
    }
    return mutateAsync(profileData)
  }

  return { linkTwitterProfile: linkTwitterProfileWithValidation, isLinkingTwitterProfile: isPending }
}

export const useGetLinkedInStats = (profileId?: string) => {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const resolvedId = profileId ?? activeProfile?._id
  const ONE_HOUR_MS = 60 * 60 * 1000

  const { data, isLoading } = useQuery<ILinkedInStats | null>({
    queryKey: [ProfileQueryEnum.GET_LINKEDIN_STATS, resolvedId],
    enabled: Boolean(resolvedId),
    staleTime: ONE_HOUR_MS,
    gcTime: ONE_HOUR_MS,
    queryFn: async () => {
      if (!resolvedId) return null
      return getLinkedInStats(resolvedId)
    },
  })

  return { data, isLoading }
}

export const useGetPostStats = (profileId?: string) => {
  return useQuery({
    queryKey: ['post-stats', profileId],
    enabled: Boolean(profileId),
    staleTime: 5 * 60 * 1000,
    queryFn: () => getPostStats(profileId!),
  })
}

export const useGetPostingStats = (profileId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['posting-stats', profileId],
    enabled: Boolean(profileId) && enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getPostingStats(profileId!),
  })
}
