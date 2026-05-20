import { createFileRoute } from '@tanstack/react-router'
import { ComposePage } from '@/features/post-generator/components/compose-page'

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/compose'
)({
  component: ComposePage,
})
