import { createFileRoute } from '@tanstack/react-router'
import { AgentQueue } from '@/features/agent-system/components/agent-queue'

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/queue'
)({
  component: AgentQueue,
})
