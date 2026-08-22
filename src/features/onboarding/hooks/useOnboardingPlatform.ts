import { useOnboardingStore } from '@/stores/onboarding.store'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { platformFor } from '../onboarding-flow'

/**
 * Which of the two onboardings the current account is in. LinkedIn and X
 * diverge after the connect step, so anything that reasons about step order or
 * navigation has to know which flow it is looking at.
 */
export function useOnboardingPlatform() {
  const { data: user } = useGetUserQuery()
  const picked = useOnboardingStore((s) => s.data.selectedPlatform)
  return platformFor(user?.metadata?.onboarding?.selectedAgentType, picked)
}
