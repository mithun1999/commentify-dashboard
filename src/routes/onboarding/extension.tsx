import { createFileRoute } from '@tanstack/react-router'
import { ExtensionStep } from '@/features/onboarding/steps/extension-step'

export const Route = createFileRoute('/onboarding/extension')({
  component: () => <ExtensionStep />,
})
