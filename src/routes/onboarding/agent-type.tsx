import { createFileRoute } from '@tanstack/react-router'
import { AgentTypeStep } from '@/features/onboarding/steps/agent-type-step'

export const Route = createFileRoute('/onboarding/agent-type')({
  component: AgentTypeStep,
})
