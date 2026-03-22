import { createFileRoute } from '@tanstack/react-router'
import AgentHub from '@/features/agent-hub'

export const Route = createFileRoute('/_authenticated/')({
  component: AgentHub,
})
