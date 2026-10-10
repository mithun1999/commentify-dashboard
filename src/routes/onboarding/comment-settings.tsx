import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useOnboardingFlow } from '@/features/onboarding/hooks/useOnboardingPlatform'
import { stepDefFor } from '@/features/onboarding/onboarding-flow'
import { TwitterReplyStyleStep } from '@/features/onboarding/steps/twitter-reply-style-step'

/**
 * X's reply agent asks for a reply style. LinkedIn derives it on the connect
 * step, so a LinkedIn tab or bookmark left here resumes where that now
 * happens; X posting has no replies to style and goes on to its preview.
 */
function CommentSettingsRoute() {
  const flow = useOnboardingFlow()
  if (!stepDefFor('comment-settings', flow)) {
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
  return <TwitterReplyStyleStep />
}

export const Route = createFileRoute('/onboarding/comment-settings')({
  component: CommentSettingsRoute,
})
