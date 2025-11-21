import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { envConfig } from '@/config/env.config'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import {
  checkIsExtensionInstalled,
  getProfileDetailsFromExtension,
} from '@/utils/utils'
import { updateOnboardingStatus } from '@/features/auth/api/user.api'
import {
  deleteProfile,
  getAllProfile,
  getLinkedInStats,
  linkProfile,
} from '../api/profile.api'
import {
  ILinkedInStats,
  IProfile,
  IProfileResponseFromExtension,
} from '../interface/profile.interface'

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

export const useLinkProfile = (isOnboardingStep: boolean = false) => {
  const queryClient = useQueryClient()
  const { setActiveProfile } = useProfileStore()

  const { mutate, isPending } = useMutation({
    mutationFn: linkProfile,
    onSuccess: (response) => {
      if (response?.profile) {
        setActiveProfile(response.profile)
        if (isOnboardingStep) {
          updateOnboardingStatus({
            status: 'in-progress',
            step: 2,
          })
        }
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
        error?.message || 'Something went wrong while linking profile'
      )
    },
  })

  const linkProfileWithValidation = async (
    profileData?: IProfileResponseFromExtension
  ) => {
    try {
      // If profile data is provided, use it directly (for onboarding flow)
      if (profileData) {
        // Validate public identifier
        if (!profileData.publicIdentifier) {
          toast.error('Please log in to LinkedIn first to continue')
          window.open('https://www.linkedin.com', '_blank')
          return
        }
        mutate(profileData)
        return
      }

      // Otherwise, fetch from extension (for connect/reconnect flows)
      // First check if extension is installed
      const isExtensionInstalled = await checkIsExtensionInstalled(
        envConfig.chromeExtensionId,
        envConfig.chromeExtensionIconUrl
      )

      if (!isExtensionInstalled) {
        toast.error('Commentify extension is not installed', {
          description: 'Please install the Chrome extension to continue.',
        })
        window.open(envConfig.extensionUrl, '_blank')
        return
      }

      // Then get profile details
      const profileDetails = await getProfileDetailsFromExtension()

      // Finally check if public identifier is available
      if (!profileDetails.publicIdentifier) {
        toast.error('Please log in to LinkedIn first to continue')
        window.open('https://www.linkedin.com', '_blank')
        return
      }

      mutate(profileDetails)
    } catch (error) {
      console.error('Error linking profile:', error)
      toast.error('Failed to link profile. Please try again.')
    }
  }

  return { linkProfile: linkProfileWithValidation, isLinkingProfile: isPending }
}

export const useGetLinkedInStats = () => {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const ONE_HOUR_MS = 60 * 60 * 1000

  const { data, isLoading } = useQuery<ILinkedInStats | null>({
    queryKey: [ProfileQueryEnum.GET_LINKEDIN_STATS, activeProfile?._id],
    enabled: Boolean(activeProfile?._id),
    staleTime: ONE_HOUR_MS,
    gcTime: ONE_HOUR_MS,
    queryFn: async () => {
      if (!activeProfile?._id) return null
      const data = await getLinkedInStats(activeProfile._id)
      return data
    },
  })

  return { data, isLoading }
}
