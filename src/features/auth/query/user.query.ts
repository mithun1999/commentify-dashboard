import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  platformFor,
  resolveSavedStep,
  stepIndexOf,
  type OnboardingStepKey,
} from '@/features/onboarding/onboarding-flow'
import { getUser, updateOnboardingStatus } from '../api/user.api'
import { IUser } from '../interface/user.interface'
import { useAuthStore } from '@/stores/auth.store'
import { useOnboardingStore } from '@/stores/onboarding.store'

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

  const { mutate, mutateAsync, isPending } = useMutation<
    IUser,
    unknown,
    UpdateOnboardingArgs
  >({
    mutationFn: ({ stepKey, rewind, ...rest }) => {
      // The agent slug this call is writing outranks the saved one: the
      // agent-type step reports its pick and its next step together, and
      // reading the old slug there would order the steps by the flow the user
      // has just left.
      const platform = platformFor(
        rest.selectedAgentType ?? user?.metadata?.onboarding?.selectedAgentType,
        pickedPlatform
      )
      const saved = resolveSavedStep(
        {
          stepKey: user?.metadata?.onboarding?.stepKey,
          step: user?.metadata?.onboarding?.step,
        },
        platform
      )
      // Someone revisiting an earlier screen should not lose the ground they
      // have already covered.
      const target =
        rewind ||
        stepIndexOf(stepKey, platform) > stepIndexOf(saved, platform)
          ? stepKey
          : saved
      return updateOnboardingStatus({
        ...rest,
        stepKey: target,
        step: stepIndexOf(target, platform),
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
