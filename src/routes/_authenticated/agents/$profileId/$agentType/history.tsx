import { createFileRoute } from '@tanstack/react-router'
import { CalendarHistory } from '@/features/post-generator/components/calendar-history'

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/history'
)({
  component: CalendarHistory,
})
