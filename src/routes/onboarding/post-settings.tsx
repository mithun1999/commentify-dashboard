import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useOnboardingFlow } from '@/features/onboarding/hooks/useOnboardingPlatform'
import { stepDefFor } from '@/features/onboarding/onboarding-flow'
import { TwitterTargetingStep } from '@/features/onboarding/steps/twitter-targeting-step'

/**
 * X's reply agent asks for targeting. LinkedIn derives it on the connect step,
 * so a LinkedIn tab or bookmark left here resumes where that now happens; X
 * posting has nothing to target and goes on to its preview.
 */
function PostSettingsRoute() {
  const flow = useOnboardingFlow()
  if (!stepDefFor('post-settings', flow)) {
    return (
      <Navigate
        to={
          flow === 'linkedin'
            ? '/onboarding/connect-account'
            : '/onboarding/preview'
        }
        replace
      />
    )
  }
  return <TwitterTargetingStep />
}

export const Route = createFileRoute('/onboarding/post-settings')({
  component: PostSettingsRoute,
})
