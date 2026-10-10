import { useOnboardingStore } from '@/stores/onboarding.store'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { flowFor } from '../onboarding-flow'

/**
 * Which onboarding the current account is in. LinkedIn and X diverge after
 * the connect step, and X runs different steps for its reply agent and its
 * posting agent, so anything that reasons about step order or navigation has
 * to know which flow it is looking at.
 */
export function useOnboardingFlow() {
  const { data: user } = useGetUserQuery()
  const platform = useOnboardingStore((s) => s.data.selectedPlatform)
  const capabilities = useOnboardingStore((s) => s.data.selectedCapabilities)
  return flowFor(user?.metadata?.onboarding?.selectedAgentType, {
    platform,
    capabilities,
  })
}
