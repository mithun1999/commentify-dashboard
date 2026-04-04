import { useEffect, useRef } from 'react'
import { usePostHog } from 'posthog-js/react'
import { useGetUserQuery } from '@/features/auth/query/user.query'
import { useOnboarding } from '@/stores/onboarding.store'

export function useTrackStepView(stepName: string) {
  const posthog = usePostHog()
  const { data: user } = useGetUserQuery()
  const { data: onboardingData } = useOnboarding()
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current || !posthog) return
    tracked.current = true

    posthog.capture('onboarding_step_viewed', {
      step: stepName,
      user_status: user?.status,
      agent_type: onboardingData.selectedAgentType ?? undefined,
      agent_mode: onboardingData.selectedAgentMode ?? undefined,
    })
  }, [posthog, stepName, user?.status, onboardingData.selectedAgentType, onboardingData.selectedAgentMode])
}
