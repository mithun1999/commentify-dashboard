import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CalendarView } from '@/features/post-generator/components/calendar-view'

// `week` is the active-week tab index. Persisted in the URL so the
// selection survives navigating to a post detail and back.
const searchSchema = z.object({
  week: z.coerce.number().int().min(0).optional(),
})

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/calendar'
)({
  validateSearch: searchSchema,
  component: CalendarView,
})
