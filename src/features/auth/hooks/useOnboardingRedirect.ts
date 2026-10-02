import { useEffect } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { onboardingRedirectTarget } from '@/features/onboarding/onboarding-flow'
import { useGetUserQuery } from '../query/user.query'

export const useOnboardingRedirect = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: user, isFetched, isLoading } = useGetUserQuery()
  const pickedPlatform = useOnboardingStore((s) => s.data.selectedPlatform)

  useEffect(() => {
    if (!isFetched || isLoading || !user) return

    const target = onboardingRedirectTarget(
      user,
      location.pathname,
      pickedPlatform
    )
    if (target) navigate({ to: target })
  }, [user, isFetched, isLoading, navigate, location.pathname, pickedPlatform])

  return { user, isFetched }
}
