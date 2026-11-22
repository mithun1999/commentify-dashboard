import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { useOnboardingStore } from '@/stores/onboarding.store'
import {
  flowFor,
  stepIndexOf,
  stepKeyToSave,
  type OnboardingStepKey,
} from '@/features/onboarding/onboarding-flow'
import { getUser, updateOnboardingStatus } from '../api/user.api'
import { IUser } from '../interface/user.interface'

export enum UserQueryEnum {
  GET_USER = 'get-user',
}

export const useGetUserQuery = () => {
  const isSessionLoaded = useAuthStore((state) => state.isSessionLoaded)
  const isSignedIn = useAuthStore((state) => Boolean(state.session?.user?.id))

  const { data, isLoading, isFetching, isFetched } = useQuery({
    queryKey: [UserQueryEnum.GET_USER],
    queryFn: getUser,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(isSessionLoaded && isSignedIn),
    // CHECK: Keeping this because it was added previously due to some error
    // placeholderData: null,
  })
  return { data, isLoading, isFetching, isFetched }
}

interface UpdateOnboardingArgs {
  status: 'not-started' | 'in-progress' | 'completed'
  /** The furthest step the user is now entitled to be on. */
  stepKey: OnboardingStepKey
  /**
   * Send the user backwards. Only the extension guard needs this - it revokes
   * progress when the extension is uninstalled mid-flow.
   */
  rewind?: boolean
  heardFrom?: string
  selectedAgentType?: string
}

export const useUpdateOnboardingStatus = () => {
  const queryClient = useQueryClient()
  const { data: user } = useGetUserQuery()
  const pickedPlatform = useOnboardingStore((s) => s.data.selectedPlatform)
  const pickedCapabilities = useOnboardingStore(
    (s) => s.data.selectedCapabilities
  )

  const { mutate, mutateAsync, isPending } = useMutation<
    IUser,
    unknown,
    UpdateOnboardingArgs
  >({
    mutationFn: async ({ stepKey, rewind, ...rest }) => {
      // Read the account again rather than trusting this tab's copy, which is
      // as old as the tab. A wizard tab left open on an earlier step would
      // otherwise save that step over progress made since in another tab. If
      // the read fails the cached copy is the best there is, and the save
      // should not be lost over it.
      const current = await getUser().catch(() => user)
      const onboarding = current?.metadata?.onboarding
      // The agent slug this call is writing outranks the saved one: the
      // agent-type step reports its pick and its next step together, and
      // reading the old slug there would order the steps by the flow the user
      // has just left.
      const flow = flowFor(
        rest.selectedAgentType ?? onboarding?.selectedAgentType,
        { platform: pickedPlatform, capabilities: pickedCapabilities }
      )
      const target = stepKeyToSave(
        stepKey,
        { stepKey: onboarding?.stepKey, step: onboarding?.step },
        flow,
        rewind
      )
      return updateOnboardingStatus({
        ...rest,
        stepKey: target,
        step: stepIndexOf(target, flow),
      })
    },
    onSuccess: (data) => {
      queryClient.setQueryData([UserQueryEnum.GET_USER], data)
    },
  })

  return {
    updateOnboardingStatus: mutate,
    updateOnboardingStatusAsync: mutateAsync,
    isUpdatingOnboardingStatus: isPending,
  }
}
