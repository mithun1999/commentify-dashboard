import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useGetUserQuery } from '../query/user.query'

export const useOnboardingRedirect = () => {
  const navigate = useNavigate()
  const { data: user, isFetched } = useGetUserQuery()

  useEffect(() => {
    if (isFetched && user?.metadata?.onboarding?.status === 'completed') {
      return
    }
    if (isFetched && !user?.metadata?.onboarding) {
      navigate({ to: '/onboarding/extension' })
      return
    }
    if (isFetched && user?.metadata?.onboarding) {
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
          // Step 4 completed, onboarding is done
          return
        default:
          navigate({ to: '/onboarding/extension' })
          break
      }
    }
  }, [user, isFetched, navigate])

  return { user, isFetched }
}
