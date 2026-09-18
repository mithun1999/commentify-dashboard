import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PostEditorPage } from '@/features/post-generator/components/post-editor-page'

// The all-time calendar links here for posts outside the active-week window,
// which the editor cannot resolve on its own. It passes the owning calendar.
//
// `month` and `week` record which view the user came from so the back button
// restores it, rather than dropping them on the current month / first week.
const searchSchema = z.object({
  calendarId: z.string().optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  week: z.coerce.number().int().min(0).optional(),
})

export const Route = createFileRoute(
  '/_authenticated/agents/$profileId/$agentType/post/$postId'
)({
  validateSearch: searchSchema,
  component: PostEditorPage,
})
