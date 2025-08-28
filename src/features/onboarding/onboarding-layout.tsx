import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import { OnboardingHeader } from './onboarding-header'
import { OnboardingProgress } from './onboarding-progress'

interface OnboardingLayoutProps {
  children: ReactNode
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const isDemoStep = location.pathname === '/onboarding/demo'
  // Prime profiles data during onboarding like in the main app
  useGetAllProfileQuery()
  const { data: user } = useGetUserQuery()

  // Once onboarding is completed, redirect to home
  useEffect(() => {
    if (user?.metadata?.onboarding?.status === 'completed') {
      navigate({ to: '/', replace: true })
    }
  }, [user?.metadata?.onboarding?.status, navigate])

  return (
    <div className='flex min-h-screen flex-col'>
      <OnboardingHeader />
      <div className='flex flex-1 flex-col lg:flex-row'>
        <main
          className={cn(
            'flex-1 px-4 py-8 md:px-8',
            isDemoStep ? 'container max-w-6xl' : 'container max-w-4xl'
          )}
        >
          {!isDemoStep ? (
            <>
              <OnboardingProgress />
              <div className='mt-8'>{children}</div>
            </>
          ) : (
            <div>{children}</div>
          )}
        </main>
      </div>
    </div>
  )
}
