import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
} from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { takePostLoginRedirect } from '@/lib/post-login-redirect'
import { useProfileStore } from '@/stores/profile.store'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-context'
import useChatSupport from '@/hooks/useChatSupport'
import useInitializeLemonSqueezy from '@/hooks/useInitializeLemonSqueezy'
import { SidebarProvider } from '@/components/ui/sidebar'
import ConnectProfileCard from '@/components/connect-profile-card'
import { AppSidebar } from '@/components/layout/app-sidebar'
import MainLoader from '@/components/main-loader'
import ProfileListError from '@/components/profile-list-error'
import SkipToMain from '@/components/skip-to-main'
import { TrialBanner } from '@/components/trial-banner'
import useInitiatePosthog from '@/features/auth/hooks/useInitiatePosthog'
import { useOnboardingRedirect } from '@/features/auth/hooks/useOnboardingRedirect'
import { UserSubscriptionStatus } from '@/features/auth/interface/user.interface'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import GeneralError from '@/features/errors/general-error'
import { getReadableErrorMessage } from '@/lib/connection-recovery'
import { ReconnectAccountDialog } from '@/features/users/components/reconnect-account-dialog'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'

export const Route = createFileRoute('/_authenticated')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const location = useLocation()
  const defaultOpen = Cookies.get('sidebar_state') !== 'false'
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false)

  const isSignedIn = useAuthStore((state) => state?.session?.user?.id)
  const isSessionLoaded = useAuthStore((state) => state?.isSessionLoaded)
  const { data: user, isFetched, isLoading } = useGetUserQuery()
  // Preload user profiles and set default activeProfile globally
  const {
    isLoading: isLoadingProfiles,
    listState: profileListState,
    error: profilesError,
    isFetching: isFetchingProfiles,
    refetch: refetchProfiles,
  } = useGetAllProfileQuery()
  const activeProfile = useProfileStore((s) => s.activeProfile)

  const isCoreFeaturePage = () => {
    const pathname = location.pathname
    const nonCorePages = [
      '/pricing',
      '/plans',
      '/billing',
      '/agents',
      '/ai-tools',
      '/',
    ]
    return !nonCorePages.some((page) =>
      page === '/' ? pathname === '/' : pathname.startsWith(page)
    )
  }

  // Handle onboarding redirection
  useOnboardingRedirect()
  // Initialize PostHog user identification
  useInitiatePosthog()
  // Initialize Lemon Squeezy script and helpers
  useInitializeLemonSqueezy()
  // Initialize Crisp chat support in production
  useChatSupport()

  useEffect(() => {
    if (isSessionLoaded && !isSignedIn) {
      navigate({ to: '/sign-in' })
    }
  }, [isSessionLoaded, isSignedIn, navigate])

  // A page that sent the user to sign in (the MCP consent screen) gets them
  // back. Every sign-in path lands here on `/`, Google's redirect included.
  useEffect(() => {
    if (!isSessionLoaded || !isSignedIn) return
    const target = takePostLoginRedirect()
    if (target) window.location.replace(target)
  }, [isSessionLoaded, isSignedIn])

  const isPending = user?.status === UserSubscriptionStatus.PENDING
  const isOnboardingCompleted =
    user?.metadata?.onboarding?.status === 'completed'
  const allowedPendingPaths = ['/plans', '/billing']
  const isOnAllowedPath = allowedPendingPaths.some((p) =>
    location.pathname.startsWith(p)
  )

  useEffect(() => {
    if (isPending && isOnboardingCompleted && !isOnAllowedPath) {
      navigate({ to: '/plans' })
    }
  }, [isPending, isOnboardingCompleted, isOnAllowedPath, navigate])

  if (
    !isSessionLoaded ||
    (!isFetched && isLoading) ||
    (isLoadingProfiles && !activeProfile)
  )
    return <MainLoader />
  if (!user && isFetched && !isLoading) return <GeneralError />

  return (
    <SearchProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SkipToMain />
        <AppSidebar />
        <div
          id='content'
          className={cn(
            'ml-auto w-full max-w-full',
            'peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]',
            'peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]',
            'sm:transition-[width] sm:duration-200 sm:ease-linear',
            'flex h-svh flex-col',
            'group-data-[scroll-locked=1]/body:h-svh',
            'has-[main.fixed-main]:group-data-[scroll-locked=1]/body:h-svh'
          )}
        >
          {user &&
            !trialBannerDismissed &&
            (user.status === UserSubscriptionStatus.PENDING ||
              user.status === UserSubscriptionStatus.IN_TRIAL ||
              user.status === UserSubscriptionStatus.TRIAL_EXPIRED) && (
              <TrialBanner
                user={user}
                onDismiss={
                  user.status === UserSubscriptionStatus.IN_TRIAL
                    ? () => setTrialBannerDismissed(true)
                    : undefined
                }
              />
            )}
          {/*
            Only a successful, empty response means "no accounts connected".
            A failed initial read gets a retry, never the connect card; a
            failed background refresh keeps the cached list on screen.
          */}
          {profileListState === 'load-error' && isCoreFeaturePage() ? (
            <ProfileListError
              message={getReadableErrorMessage(
                profilesError,
                'Something went wrong while loading your connected accounts.'
              )}
              onRetry={() => void refetchProfiles()}
              isRetrying={isFetchingProfiles}
            />
          ) : profileListState === 'empty' && isCoreFeaturePage() ? (
            <ConnectProfileCard />
          ) : (
            <Outlet />
          )}
        </div>
        <ReconnectAccountDialog />
      </SidebarProvider>
    </SearchProvider>
  )
}
