import { createFileRoute } from '@tanstack/react-router'
import { SalesLeads } from '@/features/linkedin-sales/components/sales-leads'

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/leads'
)({
  component: SalesLeads,
})
