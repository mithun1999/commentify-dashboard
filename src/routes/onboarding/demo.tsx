import { createFileRoute } from '@tanstack/react-router'
import { DemoStep } from '@/features/onboarding/steps/demo-step'

export const Route = createFileRoute('/onboarding/demo')({
  component: () => <DemoStep />,
})
