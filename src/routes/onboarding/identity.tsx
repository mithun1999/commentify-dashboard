import { createFileRoute } from '@tanstack/react-router'
import { IdentityStep } from '@/features/onboarding/steps/identity-step'

export const Route = createFileRoute('/onboarding/identity')({
  component: () => <IdentityStep />,
})
