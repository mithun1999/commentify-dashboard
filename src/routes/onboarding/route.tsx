import { useEffect } from 'react'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import MainLoader from '@/components/main-loader'
import GeneralError from '@/features/errors/general-error'
import { useAuthStore } from '@/stores/auth.store'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { OnboardingLayout } from '@/features/onboarding/onboarding-layout'
import { useOnboardingRedirect } from '@/features/auth/hooks/useOnboardingRedirect'

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

  if (!isSessionLoaded || (!isFetched && isLoading)) return <MainLoader />
  if (!user && isFetched && !isLoading) return <GeneralError />

  return (
    <OnboardingLayout>
      <Outlet />
    </OnboardingLayout>
  )
}


