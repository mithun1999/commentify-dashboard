import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useOnboardingPlatform } from '@/features/onboarding/hooks/useOnboardingPlatform'
import { PreviewStep } from '@/features/onboarding/steps/preview-step'

/**
 * The preview searches LinkedIn on the customer's own LinkedIn session, which
 * an X account does not have. Rather than let it start and fail, X is sent to
 * the targeting step it actually uses.
 */
function PreviewRoute() {
  const platform = useOnboardingPlatform()
  if (platform === 'twitter') {
    return <Navigate to='/onboarding/post-settings' replace />
  }
  return <PreviewStep />
}

export const Route = createFileRoute('/onboarding/preview')({
  component: PreviewRoute,
})
