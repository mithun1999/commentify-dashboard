import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useOnboardingPlatform } from '@/features/onboarding/hooks/useOnboardingPlatform'
import { TwitterReplyStyleStep } from '@/features/onboarding/steps/twitter-reply-style-step'

/**
 * X asks for a reply style; LinkedIn derives it on the connect step, so a
 * LinkedIn tab or bookmark left here resumes where that now happens.
 */
function CommentSettingsRoute() {
  const platform = useOnboardingPlatform()
  if (platform !== 'twitter') {
    return <Navigate to='/onboarding/connect-account' replace />
  }
  return <TwitterReplyStyleStep />
}

export const Route = createFileRoute('/onboarding/comment-settings')({
  component: CommentSettingsRoute,
})
