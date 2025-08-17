import { createFileRoute } from '@tanstack/react-router'
import { PostSettingsStep } from '@/features/onboarding/steps/post-settings-step'

export const Route = createFileRoute('/onboarding/post-settings')({
  component: () => <PostSettingsStep />,
})
