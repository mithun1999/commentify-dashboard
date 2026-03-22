import { createFileRoute } from '@tanstack/react-router'
import { AgentSettings } from '@/features/agent-system/components/agent-settings'

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/settings'
)({
  component: AgentSettings,
})
