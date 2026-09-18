import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PostCalendarGrid } from '@/features/post-generator/components/post-calendar-grid'

// `month` is the visible month as `YYYY-MM`. Persisted in the URL so the
// selection survives navigating to a post detail and back.
const searchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
})

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/history'
)({
  validateSearch: searchSchema,
  component: PostCalendarGrid,
})
