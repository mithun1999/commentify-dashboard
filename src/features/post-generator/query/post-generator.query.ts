import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  generateCalendar,
  getCurrentCalendar,
  getCalendar,
  getActiveCalendars,
  approvePost,
  editPost,
  rejectPost,
  chatEditPost,
  publishPost,
  scheduleAll,
  getCalendarHistory,
  startOnboarding,
  updateAgentTypes,
  getOnboardingStatus,
  completeOnboarding,
  listCreators,
  addCreator,
  deleteCreator,
  getPostingPreferences,
  updatePostingPreferences,
  type PostingPreferences,
} from '../api/post-generator.api'
import { ProfileQueryEnum } from '@/features/users/query/profile.query'

function extractErrorMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.message || fallback
}

export enum PostGeneratorQueryEnum {
  GET_CURRENT_CALENDAR = 'post-gen-current-calendar',
  GET_ACTIVE_CALENDARS = 'post-gen-active-calendars',
  GET_CALENDAR = 'post-gen-calendar',
  GET_CALENDAR_HISTORY = 'post-gen-calendar-history',
  ONBOARDING_STATUS = 'post-gen-onboarding-status',
  CREATORS = 'post-gen-creators',
  POSTING_PREFERENCES = 'post-gen-preferences',
}

export const useCurrentCalendar = (profileId: string | undefined) => {
  return useQuery({
    queryKey: [PostGeneratorQueryEnum.GET_CURRENT_CALENDAR, profileId],
    enabled: Boolean(profileId),
    queryFn: () => getCurrentCalendar(profileId!),
    placeholderData: (prev) => prev ?? null,
  })
}

export const useCalendar = (calendarId: string | undefined) => {
  return useQuery({
    queryKey: [PostGeneratorQueryEnum.GET_CALENDAR, calendarId],
    enabled: Boolean(calendarId),
    queryFn: () => getCalendar(calendarId!),
  })
}

export const useCalendarHistory = (profileId: string | undefined) => {
  return useQuery({
    queryKey: [PostGeneratorQueryEnum.GET_CALENDAR_HISTORY, profileId],
    enabled: Boolean(profileId),
    queryFn: () => getCalendarHistory(profileId!),
  })
}

export const useActiveCalendars = (profileId: string | undefined) => {
  return useQuery({
    queryKey: [PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS, profileId],
    enabled: Boolean(profileId),
    queryFn: () => getActiveCalendars(profileId!),
    placeholderData: (prev) => prev ?? [],
  })
}

export const useGenerateCalendar = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, weekOffset = 0 }: { profileId: string; weekOffset?: number }) =>
      generateCalendar(profileId, weekOffset),
    onSuccess: (_data, { profileId }) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CURRENT_CALENDAR, profileId],
      })
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS, profileId],
      })
      toast.success('Calendar generation started')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to generate calendar'))
    },
  })
}

export const useApprovePost = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => approvePost(calendarId, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CURRENT_CALENDAR],
      })
      toast.success('Post approved')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to approve post'))
    },
  })
}

export const useEditPost = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      editPost(calendarId, postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CURRENT_CALENDAR],
      })
      toast.success('Post saved')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to save post'))
    },
  })
}

export const useRejectPost = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, reason, profileId }: { postId: string; reason: string; profileId: string }) =>
      rejectPost(calendarId, postId, reason, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CURRENT_CALENDAR],
      })
      toast.success('Post rejected, regeneration started')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to reject post'))
    },
  })
}

export const useChatEditPost = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, message }: { postId: string; message: string }) =>
      chatEditPost(calendarId, postId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CURRENT_CALENDAR],
      })
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to process edit'))
    },
  })
}

export const usePublishPost = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => publishPost(calendarId, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CALENDAR, calendarId],
      })
      toast.success('Post queued for publishing')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to publish post'))
    },
  })
}

export const useScheduleAll = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (calendarId: string) => scheduleAll(calendarId),
    onSuccess: (_data, calendarId) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CALENDAR, calendarId],
      })
      toast.success('All approved posts scheduled')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to schedule posts'))
    },
  })
}

export const useStartOnboarding = () => {
  return useMutation({
    mutationFn: (profileId: string) => startOnboarding(profileId),
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Onboarding failed'))
    },
  })
}

export const useActivateAgentType = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, agentType }: { profileId: string; agentType: string }) =>
      updateAgentTypes(profileId, { add: agentType }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
      })
    },
  })
}

export const useOnboardingStatus = (profileId: string | undefined) => {
  return useQuery({
    queryKey: [PostGeneratorQueryEnum.ONBOARDING_STATUS, profileId],
    enabled: Boolean(profileId),
    queryFn: () => getOnboardingStatus(profileId!),
  })
}

export const useCompleteOnboarding = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (profileId: string) => completeOnboarding(profileId),
    onSuccess: (_data, profileId) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.ONBOARDING_STATUS, profileId],
      })
      toast.success('Onboarding completed')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to complete onboarding'))
    },
  })
}

export const useCreators = (profileId: string | undefined) => {
  return useQuery({
    queryKey: [PostGeneratorQueryEnum.CREATORS, profileId],
    enabled: Boolean(profileId),
    queryFn: () => listCreators(profileId!),
  })
}

export const useAddCreator = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, linkedinUrl }: { profileId: string; linkedinUrl: string }) =>
      addCreator(profileId, linkedinUrl),
    onSuccess: (_data, { profileId }) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.CREATORS, profileId],
      })
      toast.success('Creator added')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to add creator'))
    },
  })
}

export const useDeleteCreator = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ creatorId, profileId }: { creatorId: string; profileId: string }) =>
      deleteCreator(creatorId),
    onSuccess: (_data, { profileId }) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.CREATORS, profileId],
      })
      toast.success('Creator removed')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to remove creator'))
    },
  })
}

export const usePostingPreferences = (profileId: string | undefined) => {
  return useQuery({
    queryKey: [PostGeneratorQueryEnum.POSTING_PREFERENCES, profileId],
    enabled: Boolean(profileId),
    queryFn: () => getPostingPreferences(profileId!),
  })
}

export const useUpdatePostingPreferences = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, prefs }: { profileId: string; prefs: Partial<PostingPreferences> }) =>
      updatePostingPreferences(profileId, prefs),
    onSuccess: (_data, { profileId }) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.POSTING_PREFERENCES, profileId],
      })
      toast.success('Preferences saved')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to save preferences'))
    },
  })
}
