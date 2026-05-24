import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createManualPost,
  generateCalendar,
  getCurrentCalendar,
  getCalendar,
  getActiveCalendars,
  approvePost,
  editPost,
  rejectPost,
  chatEditPost,
  chatUpdateVoice,
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
  getCalendarStreamUrl,
  uploadPostMedia,
  deletePostMedia,
  regenerateAiImage,
  getFormatSuggestions,
  getBrandSettings,
  updateBrandSettings,
  rederiveBrandSettings,
  editCarouselSlide,
  regenerateCarouselSlide,
  switchCarouselTemplate,
  type CreateManualPostPayload,
  type PostingPreferences,
  type FormatSuggestion,
  type BrandSettings,
  type CarouselStyleKey,
  type CarouselStyleKey,
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
  BRAND_SETTINGS = 'post-gen-brand-settings',
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
  })
}

export const useCalendarStream = (
  calendarId: string | undefined,
  profileId: string | undefined,
) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!calendarId || !profileId) return

    const url = getCalendarStreamUrl(calendarId)
    const es = new EventSource(url)

    const refetch = () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS, profileId],
      })
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CALENDAR, calendarId],
      })
    }

    es.onmessage = (event) => {
      let payload: any
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }
      if (!payload?.type || payload.type === 'ping') return

      refetch()

      if (payload.type === 'complete' || payload.type === 'error') {
        es.close()
      }
    }

    es.onerror = () => {
      es.close()
      refetch()
    }

    return () => {
      es.close()
    }
  }, [calendarId, profileId, queryClient])
}

export const useCreateManualPost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateManualPostPayload) => createManualPost(payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS, payload.profileId],
      })
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CALENDAR_HISTORY, payload.profileId],
      })
      toast.success('Drafting your post with AI...')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to create post'))
    },
  })
}

export const useGenerateCalendar = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      profileId,
      weekOffset = 0,
      userContext,
    }: {
      profileId: string
      weekOffset?: number
      userContext?: import('../api/post-generator.api').CalendarUserContextInput
    }) => generateCalendar(profileId, weekOffset, userContext),
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

export const useChatUpdateVoice = (profileId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (message: string) => chatUpdateVoice(profileId, message),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.ONBOARDING_STATUS, profileId],
      })
      if (data.updated) {
        toast.success('Voice profile updated')
      }
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to update voice profile'))
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (profileId: string) => startOnboarding(profileId),
    onSuccess: (_data, profileId) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.ONBOARDING_STATUS, profileId],
      })
    },
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
      toast.success(
        'Creator added — re-analyzing your voice profile in the background. Refresh in ~1 min to see the updated profile.',
      )
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to add creator'))
    },
  })
}

export const useDeleteCreator = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ creatorId }: { creatorId: string; profileId: string }) =>
      deleteCreator(creatorId),
    onSuccess: (_data, { profileId }) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.CREATORS, profileId],
      })
      toast.success(
        'Creator removed — re-analyzing your voice profile in the background. Refresh in ~1 min to see the updated profile.',
      )
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

export const useUploadPostMedia = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, files }: { postId: string; files: File[] }) =>
      uploadPostMedia(postId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CALENDAR, calendarId],
      })
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Upload failed'))
    },
  })
}

export const useDeletePostMedia = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, mediaId }: { postId: string; mediaId: string }) =>
      deletePostMedia(postId, mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CALENDAR, calendarId],
      })
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to remove attachment'))
    },
  })
}

export const useRegenerateAiImage = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      postId,
      mediaId,
      instruction,
    }: {
      postId: string
      mediaId: string
      instruction: string
    }) => regenerateAiImage(postId, mediaId, instruction),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CALENDAR, calendarId],
      })
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS],
      })
      toast.success(
        data?.message ||
          'Image queued — your new image will appear here in about 2 minutes.',
      )
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to queue image regen'))
    },
  })
}

const invalidateCalendarQueries = (queryClient: any, calendarId: string) => {
  queryClient.invalidateQueries({
    queryKey: [PostGeneratorQueryEnum.GET_CALENDAR, calendarId],
  })
  queryClient.invalidateQueries({
    queryKey: [PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS],
  })
}

export const useEditCarouselSlide = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      postId,
      slideIndex,
      instruction,
    }: {
      postId: string
      slideIndex: number
      instruction: string
    }) => editCarouselSlide(postId, slideIndex, instruction),
    onSuccess: (data) => {
      invalidateCalendarQueries(queryClient, calendarId)
      toast.success(data?.message || 'Slide edit queued.')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to queue slide edit'))
    },
  })
}

export const useRegenerateCarouselSlide = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      postId,
      slideIndex,
      overrides,
    }: {
      postId: string
      slideIndex: number
      overrides?: { title?: string; body?: string; accent?: string }
    }) => regenerateCarouselSlide(postId, slideIndex, overrides ?? {}),
    onSuccess: (data) => {
      invalidateCalendarQueries(queryClient, calendarId)
      toast.success(data?.message || 'Slide regenerating.')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to queue slide regen'))
    },
  })
}

export const useSwitchCarouselTemplate = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      postId,
      styleKey,
    }: {
      postId: string
      styleKey: CarouselStyleKey
    }) => switchCarouselTemplate(postId, styleKey),
    onSuccess: (data) => {
      invalidateCalendarQueries(queryClient, calendarId)
      toast.success(data?.message || 'Switching carousel template — all slides regenerating.')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to switch carousel template'))
    },
  })
}

export const useFormatSuggestions = (
  postId: string | undefined,
  commentary: string,
  enabled: boolean,
) => {
  return useQuery<FormatSuggestion>({
    queryKey: ['post-gen-format-suggestion', postId, commentary],
    enabled: Boolean(postId) && enabled && commentary.trim().length >= 40,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: () => getFormatSuggestions(postId!, commentary),
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

export const useBrandSettings = (profileId: string | undefined) => {
  return useQuery<BrandSettings>({
    queryKey: [PostGeneratorQueryEnum.BRAND_SETTINGS, profileId],
    enabled: Boolean(profileId),
    queryFn: () => getBrandSettings(profileId!),
  })
}

export const useUpdateBrandSettings = (profileId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: {
      colors?: Partial<BrandSettings['colors']>
      lockedStyles?: CarouselStyleKey[]
    }) => updateBrandSettings(profileId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.BRAND_SETTINGS, profileId],
      })
      toast.success('Brand settings saved')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to save brand settings'))
    },
  })
}

export const useRederiveBrandSettings = (profileId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => rederiveBrandSettings(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.BRAND_SETTINGS, profileId],
      })
      toast.success('Brand re-derived from your voice and creators')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to re-derive brand'))
    },
  })
}
