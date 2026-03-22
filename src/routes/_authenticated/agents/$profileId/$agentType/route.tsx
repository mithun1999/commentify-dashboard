import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AgentLayout } from '@/features/agent-system/components/agent-layout'

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType'
)({
  component: AgentLayoutRoute,
})

function AgentLayoutRoute() {
  return (
    <AgentLayout>
      <Outlet />
    </AgentLayout>
  )
}
