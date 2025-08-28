import { useEffect } from 'react'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import MainLoader from '@/components/main-loader'
import { useOnboardingRedirect } from '@/features/auth/hooks/useOnboardingRedirect'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import GeneralError from '@/features/errors/general-error'
import { OnboardingLayout } from '@/features/onboarding/onboarding-layout'

export const Route = createFileRoute('/onboarding')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()

  const isSignedIn = useAuthStore((state) => state?.session?.user?.id)
  const isSessionLoaded = useAuthStore((state) => state?.isSessionLoaded)
  const { data: user, isFetched, isLoading } = useGetUserQuery()

  // Ensure users land on the correct onboarding step
  useOnboardingRedirect()

  useEffect(() => {
    if (isSessionLoaded && !isSignedIn) {
      navigate({ to: '/sign-in' })
    }
  }, [isSessionLoaded, isSignedIn, navigate])

  // Avoid rendering or redirecting until auth and user are settled
  if (!isSessionLoaded || (!isFetched && isLoading)) return <MainLoader />

  // If onboarding is already completed, go home before mounting layout to avoid flicker
  if (isFetched && user?.metadata?.onboarding?.status === 'completed') {
    navigate({ to: '/', replace: true })
    return null
  }
  if (!user && isFetched && !isLoading) return <GeneralError />

  return (
    <OnboardingLayout>
      <Outlet />
    </OnboardingLayout>
  )
}
