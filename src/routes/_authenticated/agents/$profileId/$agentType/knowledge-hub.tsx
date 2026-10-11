import { createFileRoute } from '@tanstack/react-router'
import { AgentLibraryTab } from '@/features/library/agent-library-tab'

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/knowledge-hub'
)({
  component: AgentLibraryTab,
})
