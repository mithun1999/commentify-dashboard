import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useGetUserQuery } from '../query/user.query'

export const useOnboardingRedirect = () => {
  const navigate = useNavigate()
  const { data: user, isFetched, isLoading } = useGetUserQuery()

  useEffect(() => {
    // Do nothing until user query resolves to avoid premature redirects
    if (!isFetched || isLoading || !user) return

    // If onboarding is completed, don't redirect anywhere from here
    if (user?.metadata?.onboarding?.status === 'completed') return

    // If onboarding metadata is missing, start at the first step
    if (!user?.metadata?.onboarding) {
      navigate({ to: '/onboarding/extension' })
      return
    }

    // Otherwise, direct to the correct in-progress step
    const { step } = user.metadata.onboarding
    switch (step) {
      case 1:
        navigate({ to: '/onboarding/linkedin' })
        break
      case 2:
        navigate({ to: '/onboarding/post-settings' })
        break
      case 3:
        navigate({ to: '/onboarding/comment-settings' })
        break
      case 4:
        navigate({ to: '/onboarding/identity' })
        break
      case 5:
        // Completed
        return
      default:
        navigate({ to: '/onboarding/extension' })
        break
    }
  }, [user, isFetched, navigate])

  return { user, isFetched }
}
