import { createFileRoute } from '@tanstack/react-router'
import { CalendarView } from '@/features/post-generator/components/calendar-view'

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/calendar'
)({
  component: CalendarView,
})
