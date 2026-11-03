import { useEffect } from 'react'
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import {
  isOnboardingPath,
  rememberPostLoginRedirect,
} from '@/lib/post-login-redirect'
import MainLoader from '@/components/main-loader'
import { useOnboardingRedirect } from '@/features/auth/hooks/useOnboardingRedirect'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import GeneralError from '@/features/errors/general-error'
import { OnboardingLayout } from '@/features/onboarding/onboarding-layout'
import { ReconnectAccountDialog } from '@/features/users/components/reconnect-account-dialog'

export const Route = createFileRoute('/onboarding')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const location = useLocation()

  const isSignedIn = useAuthStore((state) => state?.session?.user?.id)
  const isSessionLoaded = useAuthStore((state) => state?.isSessionLoaded)
  const { data: user, isFetched, isLoading } = useGetUserQuery()

  // Ensure users land on the correct onboarding step
  useOnboardingRedirect()

  // A signed-out visit to a setup step (the preview link in our emails) comes
  // back to that step after sign-in, instead of landing on Agent Hub.
  useEffect(() => {
    if (isSessionLoaded && !isSignedIn) {
      // This runs again once the URL is /sign-in; only a setup step is kept.
      if (isOnboardingPath(location.pathname))
        rememberPostLoginRedirect(location.href)
      navigate({ to: '/sign-in' })
    }
  }, [isSessionLoaded, isSignedIn, location.pathname, location.href, navigate])

  // Avoid rendering or redirecting until auth and user are settled
  if (!isSessionLoaded || (!isFetched && isLoading)) return <MainLoader />

  // If onboarding is already completed, go home
  if (isFetched && user?.metadata?.onboarding?.status === 'completed') {
    navigate({ to: '/', replace: true })
    return null
  }
  if (!user && isFetched && !isLoading) return <GeneralError />

  return (
    <OnboardingLayout>
      <Outlet />
      <ReconnectAccountDialog />
    </OnboardingLayout>
  )
}
