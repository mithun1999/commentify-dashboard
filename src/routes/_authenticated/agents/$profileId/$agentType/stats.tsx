import { createFileRoute } from '@tanstack/react-router'
import { AgentStats } from '@/features/agent-system/components/agent-stats'

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/stats'
)({
  component: AgentStats,
})
