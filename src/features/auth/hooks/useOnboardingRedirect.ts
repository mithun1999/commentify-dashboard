import { useEffect } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import {
  platformFor,
  resolveSavedStep,
  stepDefFor,
  stepIndexOf,
  stepKeyForPath,
} from '@/features/onboarding/onboarding-flow'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { useGetUserQuery } from '../query/user.query'

export const useOnboardingRedirect = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: user, isFetched, isLoading } = useGetUserQuery()
  const pickedPlatform = useOnboardingStore((s) => s.data.selectedPlatform)

  useEffect(() => {
    if (!isFetched || isLoading || !user) return

    const onboarding = user?.metadata?.onboarding
    if (onboarding?.status === 'completed') return

    const platform = platformFor(onboarding?.selectedAgentType, pickedPlatform)
    const savedKey = resolveSavedStep(
      {
        stepKey: onboarding?.stepKey,
        step: onboarding?.step,
      },
      platform
    )
    const currentKey = stepKeyForPath(location.pathname)

    // On a step we recognise, only intervene when they are ahead of their saved
    // progress. Pulling someone backwards would undo a step they just finished
    // but whose save has not landed yet.
    //
    // A step belonging to the other platform's flow indexes as -1, which is
    // never ahead - the route itself sends those on, and racing it from here
    // would fight that redirect.
    if (currentKey) {
      if (stepIndexOf(currentKey, platform) <= stepIndexOf(savedKey, platform))
        return
    }

    const target =
      stepDefFor(savedKey, platform)?.path ?? '/onboarding/agent-type'
    navigate({ to: target })
  }, [user, isFetched, isLoading, navigate, location.pathname, pickedPlatform])

  return { user, isFetched }
}
