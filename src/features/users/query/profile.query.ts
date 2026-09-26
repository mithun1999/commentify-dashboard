import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { envConfig } from '@/config/env.config'
import { useFeatureFlagEnabled } from 'posthog-js/react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { filterRecentlyDisconnected, useProfileStore } from '@/stores/profile.store'
import { useReconnectPromptStore } from '@/stores/reconnect-prompt.store'
import {
  classifyProfileListState,
  findExpectedProfile,
  getApiErrorCode,
  getReadableErrorMessage,
  isAmbiguousMutationFailure,
  LinkConfirmationUncertainError,
  PROFILE_CLEANUP_PENDING,
  ProfileReconnectRequiredError,
  toReconnectRequiredError,
} from '@/lib/connection-recovery'
import {
  describeExtensionState,
  detectExtension,
  ExtensionUnavailableError,
  getProfileDetailsFromExtension,
  notifyExtensionOfDisconnect,
} from '@/lib/extension'
import {
  disconnectProfile,
  getAllProfile,
  getLinkedInStats,
  getPostStats,
  getPostingStats,
  linkProfile,
  linkTwitterProfile,
  pauseAgent,
  resumeAgent,
  type ILinkTwitterProfilePayload,
} from '../api/profile.api'
import {
  IDisconnectProfileResponse,
  ILinkProfilePayload,
  ILinkProfileResponse,
  ILinkedInStats,
  IProfile,
  IProfileResponseFromExtension,
} from '../interface/profile.interface'
import type { ITwitterProfileFromExtension } from '@/features/twitter-commenting/utils/extension'

export enum ProfileQueryEnum {
  GET_ALL_PROFILE = 'get-all-profile',
  GET_LINKEDIN_STATS = 'get-linkedin-stats',
}

type AgentToggleVariables = { profileId: string; agentType: string }

export const useGetAllProfileQuery = () => {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)
  const recentlyDisconnected = useProfileStore((s) => s.recentlyDisconnected)
  const isSessionLoaded = useAuthStore((state) => state.isSessionLoaded)
  const isSignedIn = useAuthStore((state) => Boolean(state.session?.user?.id))

  const { data, isLoading, isFetched, isError, error, isFetching, refetch } =
    useQuery<IProfile[]>({
      queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
      queryFn: getAllProfile,
      enabled: Boolean(isSessionLoaded && isSignedIn),
      // The authenticated layout renders its own retryable error state for
      // this query; the global toast would only duplicate it.
      meta: { suppressGlobalErrorToast: true },
      // A list response that started before a disconnect must not bring the
      // account back for a moment.
      select: (profiles) =>
        filterRecentlyDisconnected(profiles, recentlyDisconnected),
    })

  useEffect(() => {
    if (!Array.isArray(data)) return
    if (!activeProfile && data.length > 0) {
      setActiveProfile(data[data.length - 1])
      return
    }
    // The selected account was disconnected (here or elsewhere): move the
    // selection rather than leave the app pointed at a profile that is gone.
    if (activeProfile && !data.some((p) => p._id === activeProfile._id)) {
      setActiveProfile(data.length > 0 ? data[data.length - 1] : null)
    }
  }, [activeProfile, data, setActiveProfile])

  const listState = classifyProfileListState({
    isLoading,
    isError,
    isFetched,
    data,
  })

  return {
    data,
    isLoading,
    isFetched,
    isError,
    error,
    isFetching,
    refetch,
    listState,
  }
}

/**
 * Disconnect = revoke the account's connection on the backend, then make the
 * client forget it: cancel in-flight list reads, drop it from the cache,
 * move the selection, and refresh dependent data separately (one
 * invalidation per query family - a combined key matches nothing).
 */
export const useDisconnectProfile = ({
  onSuccess,
}: {
  onSuccess?: (result: IDisconnectProfileResponse, profile: IProfile) => void
} = {}) => {
  const queryClient = useQueryClient()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)
  const markDisconnected = useProfileStore((s) => s.markDisconnected)

  const mutation = useMutation({
    mutationFn: (profile: IProfile) => disconnectProfile(profile._id),
    // The dialog keeps the API error visible next to the action.
    meta: { suppressGlobalErrorToast: true },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
      })
    },
    onSuccess: (result, profile) => {
      markDisconnected(profile._id)
      queryClient.setQueryData<IProfile[]>(
        [ProfileQueryEnum.GET_ALL_PROFILE],
        (old) => old?.filter((p) => p._id !== profile._id)
      )
      if (activeProfile?._id === profile._id) {
        const remaining =
          queryClient.getQueryData<IProfile[]>([
            ProfileQueryEnum.GET_ALL_PROFILE,
          ]) ?? []
        setActiveProfile(remaining[remaining.length - 1] ?? null)
      }
      queryClient.removeQueries({
        queryKey: [ProfileQueryEnum.GET_LINKEDIN_STATS, profile._id],
      })
      queryClient.removeQueries({ queryKey: ['post-stats', profile._id] })
      queryClient.removeQueries({ queryKey: ['posting-stats', profile._id] })
      void queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
      })
      void notifyExtensionOfDisconnect(
        profile.platform === 'twitter' ? 'twitter' : 'linkedin'
      )

      const label =
        profile.platform === 'twitter' && profile.screenName
          ? `@${profile.screenName}`
          : `${profile.firstName} ${profile.lastName}`.trim()
      toast.success(
        result.cleanupStatus === 'complete'
          ? `${label} disconnected. Queued comments and posts were cancelled.`
          : `${label} disconnected. We're still cancelling its queued work; nothing will be published.`
      )
      onSuccess?.(result, profile)
    },
  })

  return {
    disconnectProfile: mutation.mutateAsync,
    isDisconnecting: mutation.isPending,
    disconnectError: mutation.error,
    resetDisconnectError: mutation.reset,
  }
}

export const usePauseAgent = ({
  onSuccess,
  pausedWorkLabel,
}: { onSuccess?: () => void; pausedWorkLabel?: string } = {}) => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: ({ profileId, agentType }: AgentToggleVariables) =>
      pauseAgent(profileId, agentType),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
      })
      toast.success(
        pausedWorkLabel
          ? `Agent paused. ${pausedWorkLabel} is stopped.`
          : 'Agent paused.'
      )
      onSuccess?.()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while pausing the agent'
      )
    },
  })
  return { pauseAgent: mutate, isPausingAgent: isPending }
}

export const useResumeAgent = ({
  onSuccess,
  nextRunLabel,
}: { onSuccess?: () => void; nextRunLabel?: string | null } = {}) => {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: ({ profileId, agentType }: AgentToggleVariables) =>
      resumeAgent(profileId, agentType),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
      })
      // Resuming recreates a daily cron at the configured slot rather than
      // running now, so say when — otherwise it reads as a no-op.
      toast.success(
        nextRunLabel
          ? `Agent resumed. Next run ${nextRunLabel}.`
          : 'Agent resumed.'
      )
      onSuccess?.()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while resuming the agent'
      )
    },
  })
  return { resumeAgent: mutate, isResumingAgent: isPending }
}

/**
 * Runs the link write once and settles its outcome honestly:
 * - a definitive 4xx is a failure;
 * - a reconnect-required 409 becomes ProfileReconnectRequiredError;
 * - a timeout / 5xx is ambiguous - the write may have landed - so the
 *   expected account is looked for with an owner-scoped read. Found and
 *   connected: success. Otherwise LinkConfirmationUncertainError, never a
 *   second blind POST of the credentials.
 */
async function linkWithReconciliation<TPayload>(
  write: (payload: TPayload) => Promise<ILinkProfileResponse>,
  payload: TPayload,
  expected: { profileUrn?: string; twitterUserId?: string }
): Promise<ILinkProfileResponse> {
  try {
    return await write(payload)
  } catch (error) {
    const reconnectRequired = toReconnectRequiredError(error)
    if (reconnectRequired) throw reconnectRequired
    if (!isAmbiguousMutationFailure(error)) throw error

    let profiles: IProfile[]
    try {
      profiles = await getAllProfile()
    } catch {
      throw new LinkConfirmationUncertainError(error)
    }
    const match = findExpectedProfile(profiles, expected)
    if (match) return { profile: match, isExisting: true, reconciled: true }
    throw new LinkConfirmationUncertainError(error)
  }
}

/**
 * The successful link response is the source of truth for "connected": the
 * selection and the list cache are updated from it immediately, and the list
 * is revalidated in the background without withholding or undoing that.
 */
function applyLinkedProfile(
  queryClient: ReturnType<typeof useQueryClient>,
  setActiveProfile: (profile: IProfile | null) => void,
  response: ILinkProfileResponse
) {
  if (!response?.profile) return
  setActiveProfile(response.profile)
  queryClient.setQueryData<IProfile[]>(
    [ProfileQueryEnum.GET_ALL_PROFILE],
    (old) => {
      const rest = (old ?? []).filter((p) => p._id !== response.profile._id)
      return [...rest, response.profile]
    }
  )
  void queryClient.invalidateQueries({
    queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
  })
}

function reportLinkFailure(error: unknown, fallback: string) {
  if (error instanceof LinkConfirmationUncertainError) {
    toast.error(error.message, {
      id: 'link-uncertain',
      description:
        'Your account may already be connected. Refresh this page or try again.',
    })
    return
  }
  if (getApiErrorCode(error) === PROFILE_CLEANUP_PENDING) {
    toast.error(getReadableErrorMessage(error), { id: 'link-cleanup-pending' })
    return
  }
  if (error instanceof ExtensionUnavailableError) {
    toast.error(error.message, { id: 'link-extension' })
    return
  }
  toast.error(getReadableErrorMessage(error, fallback))
}

export const useLinkProfile = (_isOnboardingStep: boolean = false) => {
  const chromeExtensionAvailable = useFeatureFlagEnabled('chrome-extension-available')
  const queryClient = useQueryClient()
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)
  const askReconnect = useReconnectPromptStore((s) => s.ask)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: ILinkProfilePayload) =>
      linkWithReconciliation(linkProfile, payload, {
        profileUrn: payload.profileUrn,
      }),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: (response) =>
      applyLinkedProfile(queryClient, setActiveProfile, response),
  })

  const runLink = async (
    payload: ILinkProfilePayload,
    allowReconnectPrompt = true
  ): Promise<ILinkProfileResponse | undefined> => {
    try {
      return await mutateAsync(payload)
    } catch (error) {
      if (error instanceof ProfileReconnectRequiredError && allowReconnectPrompt) {
        const confirmed = await askReconnect({
          platform: 'linkedin',
          profile: error.profile,
        })
        if (!confirmed) return undefined
        return runLink({ ...payload, reconnect: true }, false)
      }
      reportLinkFailure(error, 'Something went wrong while linking profile')
      return undefined
    }
  }

  const linkProfileWithValidation = async (
    profileData?: IProfileResponseFromExtension,
    options: { reconnect?: boolean } = {}
  ): Promise<ILinkProfileResponse | undefined> => {
    if (profileData) {
      if (!profileData.publicIdentifier) {
        toast.error('Please log in to LinkedIn first to continue')
        window.open('https://www.linkedin.com', '_blank')
        return undefined
      }
      return runLink({ ...profileData, reconnect: options.reconnect })
    }

    const detection = await detectExtension()
    if (!detection.installed) {
      toast.error(describeExtensionState(detection.state), {
        id: 'link-extension',
        description: chromeExtensionAvailable
          ? 'Install or enable the extension from the Chrome Web Store, then check again.'
          : 'Install or enable the Chrome extension, then check again.',
      })
      if (detection.state.status === 'not-detected' && !detection.state.installedButUnreachable) {
        window.open(
          chromeExtensionAvailable ? envConfig.chromeWebStoreUrl : envConfig.extensionUrl,
          '_blank'
        )
      }
      return undefined
    }

    let profileDetails: IProfileResponseFromExtension
    try {
      profileDetails = await getProfileDetailsFromExtension()
    } catch (error) {
      reportLinkFailure(error, 'Could not read your LinkedIn profile from the extension')
      return undefined
    }

    if (!profileDetails?.publicIdentifier) {
      toast.error('Please log in to LinkedIn first to continue')
      window.open('https://www.linkedin.com', '_blank')
      return undefined
    }

    return runLink({ ...profileDetails, reconnect: options.reconnect })
  }

  return { linkProfile: linkProfileWithValidation, isLinkingProfile: isPending }
}

export const useLinkTwitterProfile = (_isOnboardingStep: boolean = false) => {
  const queryClient = useQueryClient()
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)
  const askReconnect = useReconnectPromptStore((s) => s.ask)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: ILinkTwitterProfilePayload) =>
      linkWithReconciliation(linkTwitterProfile, payload, {
        twitterUserId: payload.twitterUserId,
      }),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: (response) =>
      applyLinkedProfile(queryClient, setActiveProfile, response),
  })

  const runLink = async (
    payload: ILinkTwitterProfilePayload,
    allowReconnectPrompt = true
  ): Promise<ILinkProfileResponse | undefined> => {
    try {
      return await mutateAsync(payload)
    } catch (error) {
      if (error instanceof ProfileReconnectRequiredError && allowReconnectPrompt) {
        const confirmed = await askReconnect({
          platform: 'twitter',
          profile: error.profile,
        })
        if (!confirmed) return undefined
        return runLink({ ...payload, reconnect: true }, false)
      }
      reportLinkFailure(error, 'Something went wrong while linking X profile')
      return undefined
    }
  }

  const linkTwitterProfileWithValidation = async (
    profileData: ITwitterProfileFromExtension,
    options: { reconnect?: boolean } = {}
  ): Promise<ILinkProfileResponse | undefined> => {
    if (!profileData?.screenName) {
      toast.error('Please log in to X.com first to continue')
      window.open('https://x.com', '_blank')
      return undefined
    }
    return runLink({ ...profileData, reconnect: options.reconnect })
  }

  return {
    linkTwitterProfile: linkTwitterProfileWithValidation,
    isLinkingTwitterProfile: isPending,
  }
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
