import { useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { QueryService } from '@/services/query.service'
import { toast } from 'sonner'
import { useProfileStore } from '@/stores/profile.store'
import {
  deleteProfile,
  getAllProfile,
  getLinkedInStats,
  linkProfile,
} from '../api/profile.api'
import { ILinkedInStats, IProfile } from '../interface/profile.interface'

export enum ProfileQueryEnum {
  GET_ALL_PROFILE = 'get-all-profile',
  GET_LINKEDIN_STATS = 'get-linkedin-stats',
}

export const useGetAllProfileQuery = () => {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)
  const { data, isLoading } = useQuery<IProfile[]>({
    queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
    queryFn: getAllProfile,
  })

  useEffect(() => {
    if (!activeProfile && Array.isArray(data) && data.length > 0) {
      setActiveProfile(data[0])
    }
  }, [activeProfile, data, setActiveProfile])

  return { data, isLoading }
}

export const useDeleteProfile = () => {
  const queryClient = QueryService.getQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
      })
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

export const useLinkProfile = () => {
  const queryClient = QueryService.getQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: linkProfile,
    onSuccess: (response) => {
      if (response?.profile) {
        queryClient.invalidateQueries({
          queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
        })
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error?.message || 'Something went wrong while linking profile')
    },
  })

  return { linkProfile: mutate, isLinkingProfile: isPending }
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
