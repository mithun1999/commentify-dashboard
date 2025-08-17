import { createFileRoute } from '@tanstack/react-router'
import { LinkedInStep } from '@/features/onboarding/steps/linkedin-step'

export const Route = createFileRoute('/onboarding/linkedin')({
  component: () => <LinkedInStep />,
})
