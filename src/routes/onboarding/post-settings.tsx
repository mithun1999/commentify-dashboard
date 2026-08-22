import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useOnboardingPlatform } from '@/features/onboarding/hooks/useOnboardingPlatform'
import { TwitterTargetingStep } from '@/features/onboarding/steps/twitter-targeting-step'

/**
 * X asks for targeting; LinkedIn derives it on the connect step, so a LinkedIn
 * tab or bookmark left here resumes where that now happens.
 */
function PostSettingsRoute() {
  const platform = useOnboardingPlatform()
  if (platform !== 'twitter') {
    return <Navigate to='/onboarding/connect-account' replace />
  }
  return <TwitterTargetingStep />
}

export const Route = createFileRoute('/onboarding/post-settings')({
  component: PostSettingsRoute,
})
