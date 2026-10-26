import { useEffect } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useOnboardingStore } from '@/stores/onboarding.store'
import {
  isAgentControlPath,
  onboardingRedirectTarget,
} from '@/features/onboarding/onboarding-flow'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import { useGetUserQuery } from '../query/user.query'

export const useOnboardingRedirect = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: user, isFetched, isLoading } = useGetUserQuery()
  const {
    data: profiles,
    isFetched: profilesFetched,
    isError: profilesError,
    isFetching: profilesFetching,
  } = useGetAllProfileQuery()
  const profilesSettled = profilesFetched || profilesError
  // Only a loaded, current list can say "no account connected"; a failed or
  // in-flight one stays unknown so nobody is pulled back to connect on a guess.
  const hasConnectedProfile =
    (profiles?.length ?? 0) > 0
      ? true
      : profilesFetched && !profilesError && !profilesFetching
        ? false
        : undefined
  const pickedPlatform = useOnboardingStore((s) => s.data.selectedPlatform)
  const pickedCapabilities = useOnboardingStore(
    (s) => s.data.selectedCapabilities
  )

  useEffect(() => {
    if (!isFetched || isLoading || !user) return
    // Whether to leave them on Agent Hub depends on the account list; deciding
    // before it arrives would bounce someone with a running agent to setup.
    if (!profilesSettled && isAgentControlPath(location.pathname)) return

    const target = onboardingRedirectTarget(
      user,
      location.pathname,
      {
        platform: pickedPlatform,
        capabilities: pickedCapabilities,
      },
      hasConnectedProfile
    )
    if (target) navigate({ to: target })
  }, [
    user,
    isFetched,
    isLoading,
    navigate,
    location.pathname,
    pickedPlatform,
    pickedCapabilities,
    profilesSettled,
    hasConnectedProfile,
  ])

  return { user, isFetched }
}
