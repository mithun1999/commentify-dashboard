import { useEffect } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { pendingClaimFor } from '@/features/appsumo/claim'
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
  const sessionUserId = useAuthStore((s) => s.session?.user?.id)
  const pickedPlatform = useOnboardingStore((s) => s.data.selectedPlatform)
  const pickedCapabilities = useOnboardingStore(
    (s) => s.data.selectedCapabilities
  )

  useEffect(() => {
    if (!isFetched || isLoading || !user) return
    // A license redeemed from AppSumo before signing in is linked on its own
    // page, wherever sign-in or sign-up dropped the buyer.
    if (pendingClaimFor(sessionUserId)) {
      navigate({ to: '/appsumo' })
      return
    }
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
    sessionUserId,
  ])

  return { user, isFetched }
}
