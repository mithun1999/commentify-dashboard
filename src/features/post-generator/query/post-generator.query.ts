import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ProfileQueryEnum } from '@/features/users/query/profile.query'
import {
  createManualPost,
  generateCalendar,
  getCurrentCalendar,
  getCalendar,
  getActiveCalendars,
  approvePost,
  unapprovePost,
  editPost,
  rejectPost,
  deletePost,
  chatEditPost,
  chatUpdateVoice,
  publishPost,
  reschedulePost,
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
  getProfileStreamUrl,
  uploadPostMedia,
  deletePostMedia,
  regenerateAiImage,
  getFormatSuggestions,
  getBrandSettings,
  updateBrandSettings,
  rederiveBrandSettings,
  getMasterySignals,
  recomputeMasterySignals,
  editCarouselSlide,
  regenerateCarouselSlide,
  switchCarouselTemplate,
  type CreateManualPostPayload,
  type PostingPreferences,
  type FormatSuggestion,
  type BrandSettings,
  type CarouselStyleKey,
  type SlideTemplateKey,
} from '../api/post-generator.api'

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
  MASTERY_SIGNALS = 'post-gen-mastery-signals',
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

export type PostStage =
  'researching' | 'planning' | 'writing' | 'reviewing' | 'revising'

export interface ResearchClaim {
  headline: string
  source?: string
  url?: string
  date?: string
  summary?: string
}

/** One thing the edit agent did, as it did it. */
export interface EditStep {
  key: string
  label: string
}

export const useCalendarStream = (
  calendarId: string | undefined,
  profileId: string | undefined
) => {
  const queryClient = useQueryClient()
  const [stages, setStages] = useState<Record<string, PostStage>>({})
  const [claims, setClaims] = useState<Record<string, ResearchClaim[]>>({})
  const [details, setDetails] = useState<Record<string, string | undefined>>({})

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

      // Catching up on what was missed before this connection existed. The
      // first stage is emitted while the browser is still creating the post and
      // routing to the editor, so it is always gone by the time anyone is
      // listening, and the next one can be forty seconds of research later.
      if (payload.type === 'snapshot') {
        const seenStages: Record<string, PostStage> = {}
        const seenClaims: Record<string, ResearchClaim[]> = {}
        for (const post of payload.posts ?? []) {
          // A finished post's last stage says nothing about now.
          if (post.status !== 'generating') continue
          if (post.generationStage) seenStages[post._id] = post.generationStage
          if (post.researchClaims?.length) {
            seenClaims[post._id] = post.researchClaims
          }
        }
        // Anything already streamed is newer than the snapshot, so it wins.
        setStages((prev) => ({ ...seenStages, ...prev }))
        setClaims((prev) => ({ ...seenClaims, ...prev }))
        refetch()
        return
      }

      // Progress is display-only and fires several times per post. Refetching
      // on it would multiply calendar requests for data that has not changed —
      // nothing is written to the post until it is ready.
      if (payload.type === 'post_progress') {
        setStages((prev) => ({ ...prev, [payload.postId]: payload.stage }))
        // Set unconditionally: an event without one has moved past whatever the
        // last detail described, and leaving it up would caption the new stage
        // with the old stage's work.
        setDetails((prev) => ({ ...prev, [payload.postId]: payload.detail }))
        // Claims are persisted on the post, but only a refetch would surface
        // them and progress deliberately does not refetch. Riding along on the
        // event is what lets the sources appear while the draft is still being
        // written, which is the only time anyone is watching this screen.
        if (payload.claims?.length) {
          setClaims((prev) => ({ ...prev, [payload.postId]: payload.claims }))
        }
        return
      }

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

  return { stages, claims, details }
}

/**
 * Live steps from an agent working somewhere on this profile.
 *
 * Editing cannot ride the calendar stream: that one hangs up the moment nothing
 * is generating, which during an edit is always, so every step it sent landed
 * on a connection the browser had already given up on. This one is opened by
 * the caller for the turn it is waiting on and closed when the turn settles.
 */
const useProfileSteps = (
  profileId: string | undefined,
  type: string,
  postId?: string
) => {
  const [steps, setSteps] = useState<EditStep[]>([])

  useEffect(() => {
    if (!profileId) return

    const es = new EventSource(getProfileStreamUrl(profileId))

    es.onmessage = (event) => {
      let payload: any
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }
      if (payload?.type !== type) return
      if (postId && payload.postId !== postId) return
      // The agent carries its whole list on every event, so this replaces
      // rather than appends and a late subscriber still catches up.
      setSteps(payload.steps ?? [])
    }

    es.onerror = () => es.close()

    return () => es.close()
  }, [profileId, type, postId])

  const clearSteps = useCallback(() => setSteps([]), [])

  return { steps, clearSteps }
}

export const useVoiceStream = (profileId: string | undefined) =>
  useProfileSteps(profileId, 'voice_edit_progress')

export const usePostEditStream = (
  profileId: string | undefined,
  postId: string
) => useProfileSteps(profileId, 'post_edit_progress', postId)

export const useCreateManualPost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateManualPostPayload) => createManualPost(payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({
        queryKey: [
          PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS,
          payload.profileId,
        ],
      })
      queryClient.invalidateQueries({
        queryKey: [
          PostGeneratorQueryEnum.GET_CALENDAR_HISTORY,
          payload.profileId,
        ],
      })
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

export const useUnapprovePost = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => unapprovePost(calendarId, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CURRENT_CALENDAR],
      })
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS],
      })
      toast.success('Post moved back to draft')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to unapprove post'))
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
    mutationFn: ({
      postId,
      reason,
      profileId,
    }: {
      postId: string
      reason: string
      profileId: string
    }) => rejectPost(calendarId, postId, reason, profileId),
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

export const useDeletePost = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId }: { postId: string }) =>
      deletePost(calendarId, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CURRENT_CALENDAR],
      })
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CALENDAR, calendarId],
      })
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS],
      })
      toast.success('Post deleted')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to delete post'))
    },
  })
}

export const useChatEditPost = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, message }: { postId: string; message: string }) =>
      chatEditPost(calendarId, postId, message),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CURRENT_CALENDAR],
      })
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CALENDAR, calendarId],
      })
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS],
      })
      // One turn can rewrite the body and queue a carousel, and the queued work
      // is the part that finishes later and so needs announcing.
      const actions = data?.actions ?? (data?.action ? [data.action] : [])
      if (actions.includes('convert_to_carousel')) {
        toast.success('Generating carousel slides…')
      }
      if (actions.includes('edit_carousel_slides')) {
        toast.success('Updating the carousel slides…')
      }
      if (actions.includes('regenerate_image')) {
        toast.success('Working on the image…')
      }
      if (data?.action === 'unsupported') {
        toast.info(data.assistantMessage || "That request isn't supported.")
      }
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
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS],
      })
      toast.success('Publishing now — your post will be live in a moment')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to publish post'))
    },
  })
}

export const useReschedulePost = (calendarId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      postId,
      scheduledAt,
    }: {
      postId: string
      scheduledAt: string
    }) => reschedulePost(calendarId, postId, scheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_CALENDAR, calendarId],
      })
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.GET_ACTIVE_CALENDARS],
      })
      toast.success('Post rescheduled')
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to reschedule post'))
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
    mutationFn: ({
      profileId,
      agentType,
    }: {
      profileId: string
      agentType: string
    }) => updateAgentTypes(profileId, { add: agentType }),
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
    mutationFn: ({
      profileId,
      linkedinUrl,
    }: {
      profileId: string
      linkedinUrl: string
    }) => addCreator(profileId, linkedinUrl),
    onSuccess: (_data, { profileId }) => {
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.CREATORS, profileId],
      })
      toast.success(
        'Creator added — re-analyzing your voice profile in the background. Refresh in ~1 min to see the updated profile.'
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
        'Creator removed — re-analyzing your voice profile in the background. Refresh in ~1 min to see the updated profile.'
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
          'Image queued — your new image will appear here in about 2 minutes.'
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
      overrides?: {
        title?: string
        body?: string
        accent?: string
        slideTemplate?: SlideTemplateKey
      }
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
      toast.success(
        data?.message ||
          'Switching carousel template — all slides regenerating.'
      )
    },
    onError: (error: any) => {
      toast.error(
        extractErrorMessage(error, 'Failed to switch carousel template')
      )
    },
  })
}

export const useFormatSuggestions = (
  postId: string | undefined,
  commentary: string,
  enabled: boolean
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
    mutationFn: ({
      profileId,
      prefs,
    }: {
      profileId: string
      prefs: Partial<PostingPreferences>
    }) => updatePostingPreferences(profileId, prefs),
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
      allowMemes?: boolean
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

export const useMasterySignals = (profileId: string | undefined) => {
  return useQuery({
    queryKey: [PostGeneratorQueryEnum.MASTERY_SIGNALS, profileId],
    queryFn: () => getMasterySignals(profileId!),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
    // Recompute is queued (Bull) and runs 20-60s. While computing, the
    // backend keeps `status: 'computing'` on the voice signature; poll
    // every 20s and stop once it flips to idle/failed.
    refetchInterval: (query) =>
      query.state.data?.status === 'computing' ? 20000 : false,
    refetchIntervalInBackground: false,
  })
}

export const useRecomputeMasterySignals = (profileId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => recomputeMasterySignals(profileId),
    onSuccess: (data) => {
      // Optimistically flip the cached signal to `computing` so the UI
      // switches to the skeleton on the very next render — the polling
      // refetch will pick up the real result.
      queryClient.setQueryData(
        [PostGeneratorQueryEnum.MASTERY_SIGNALS, profileId],
        (prev: any) =>
          prev ? { ...prev, status: data.status, error: null } : prev
      )
      queryClient.invalidateQueries({
        queryKey: [PostGeneratorQueryEnum.MASTERY_SIGNALS, profileId],
      })
      toast.success(
        data.queued
          ? 'Re-analyzing your expertise — this takes ~30s'
          : 'Already re-analyzing — please wait'
      )
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error, 'Failed to refresh expertise'))
    },
  })
}
