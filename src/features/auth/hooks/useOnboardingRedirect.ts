import { useEffect } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useGetUserQuery } from '../query/user.query'

const STEP_ROUTES: Record<number, string> = {
  0: '/onboarding/extension',
  1: '/onboarding/linkedin',
  2: '/onboarding/post-settings',
  3: '/onboarding/comment-settings',
  4: '/onboarding/identity',
}

const ROUTE_STEPS: Record<string, number> = {
  '/onboarding/extension': 0,
  '/onboarding/linkedin': 1,
  '/onboarding/post-settings': 2,
  '/onboarding/comment-settings': 3,
  '/onboarding/identity': 4,
}

export const useOnboardingRedirect = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: user, isFetched, isLoading } = useGetUserQuery()

  useEffect(() => {
    if (!isFetched || isLoading || !user) return

    if (user?.metadata?.onboarding?.status === 'completed') return

    const backendStep = user?.metadata?.onboarding?.step ?? 0
    const currentPageStep = ROUTE_STEPS[location.pathname]

    // If we're on a recognized onboarding page, only redirect if the user
    // is trying to jump AHEAD of their progress (prevent skipping).
    // Never pull them backward from an earlier step.
    if (currentPageStep !== undefined) {
      if (currentPageStep <= backendStep) return
    }

    const targetRoute = STEP_ROUTES[backendStep] ?? '/onboarding/extension'
    navigate({ to: targetRoute })
  }, [user, isFetched, isLoading, navigate, location.pathname])

  return { user, isFetched }
}
