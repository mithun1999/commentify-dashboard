import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useOnboardingFlow } from '@/features/onboarding/hooks/useOnboardingPlatform'
import { stepDefFor } from '@/features/onboarding/onboarding-flow'
import { PreviewStep } from '@/features/onboarding/steps/preview-step'

/**
 * The comment preview searches LinkedIn on the customer's own LinkedIn
 * session, which an X account does not have, so X's reply agent alone is sent
 * to the targeting step it actually uses. X posting does get this screen: it
 * writes a post from the account's own X posts.
 */
function PreviewRoute() {
  const flow = useOnboardingFlow()
  if (!stepDefFor('preview', flow)) {
    return <Navigate to='/onboarding/post-settings' replace />
  }
  return <PreviewStep />
}

export const Route = createFileRoute('/onboarding/preview')({
  component: PreviewRoute,
})
