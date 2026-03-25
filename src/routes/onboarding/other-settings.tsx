import { createFileRoute } from '@tanstack/react-router'
import { CommentSettingsStep as OtherSettingStep } from '@/features/onboarding/steps/comment-settings-step'

export const Route = createFileRoute('/onboarding/other-settings')({
  component: () => <OtherSettingStep />,
})
